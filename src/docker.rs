use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;
use tempfile::TempDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DockerLayer {
    pub id: String,
    pub created_by: String,
    pub size: u64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DockerImage {
    pub id: String,
    pub tags: Vec<String>,
    pub layers: Vec<DockerLayer>,
}

pub fn inspect_image(image_name: &str) -> Result<DockerImage> {
    let output = Command::new("docker")
        .args(["inspect", image_name])
        .output()?;

    if !output.status.success() {
        return Err(anyhow!(
            "Failed to inspect image: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let inspect_output: Vec<serde_json::Value> = serde_json::from_slice(&output.stdout)?;
    if inspect_output.is_empty() {
        return Err(anyhow!("No image found with name: {}", image_name));
    }

    let image_data = &inspect_output[0];

    let id = image_data["Id"]
        .as_str()
        .ok_or_else(|| anyhow!("Failed to get image ID"))?
        .to_string();

    let tags = image_data["RepoTags"]
        .as_array()
        .map(|tags| {
            tags.iter()
                .filter_map(|tag| tag.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let layers = image_data["RootFS"]["Layers"]
        .as_array()
        .ok_or_else(|| anyhow!("Failed to get image layers"))?
        .iter()
        .enumerate()
        .map(|(i, layer)| {
            let layer_id = layer
                .as_str()
                .ok_or_else(|| anyhow!("Failed to get layer ID"))?
                .to_string();

            Ok(DockerLayer {
                id: layer_id,
                created_by: format!("Layer {}", i + 1), // Simplified for now
                size: 0,                                // We'll get this from history
                created_at: "".to_string(),             // We'll get this from history
            })
        })
        .collect::<Result<Vec<_>>>()?;

    Ok(DockerImage { id, tags, layers })
}

pub fn get_image_history(image_name: &str) -> Result<Vec<DockerLayer>> {
    let output = Command::new("docker")
        .args([
            "history",
            "--no-trunc",
            "--format",
            "{{.ID}}|{{.CreatedBy}}|{{.Size}}|{{.CreatedAt}}",
            image_name,
        ])
        .output()?;

    if !output.status.success() {
        return Err(anyhow!(
            "Failed to get image history: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let history_output = String::from_utf8_lossy(&output.stdout);
    let layers = history_output
        .lines()
        .filter(|line| !line.is_empty())
        .map(|line| {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() < 4 {
                return Err(anyhow!("Invalid history line format"));
            }

            let size_str = parts[2].trim();
            let size = if size_str.ends_with('B') {
                // Parse size like "10MB", "1.5KB", etc.
                let size_num = size_str
                    .trim_end_matches(|c: char| c.is_alphabetic() || c == 'B')
                    .trim();

                let multiplier = if size_str.ends_with("KB") {
                    1024
                } else if size_str.ends_with("MB") {
                    1024 * 1024
                } else if size_str.ends_with("GB") {
                    1024 * 1024 * 1024
                } else {
                    1
                };

                size_num.parse::<f64>().unwrap_or(0.0) as u64 * multiplier
            } else {
                size_str.parse().unwrap_or(0)
            };

            Ok(DockerLayer {
                id: parts[0].to_string(),
                created_by: parts[1].to_string(),
                size,
                created_at: parts[3].to_string(),
            })
        })
        .collect::<Result<Vec<_>>>()?;

    Ok(layers)
}

pub fn extract_layer_files(image_name: &str, layer_id: &str) -> Result<TempDir> {
    let temp_dir = TempDir::new()?;
    let temp_path = temp_dir
        .path()
        .to_str()
        .ok_or_else(|| anyhow!("Failed to get temp dir path"))?;

    // Create a temporary container
    let container_id = {
        let output = Command::new("docker")
            .args(["create", image_name])
            .output()?;

        if !output.status.success() {
            return Err(anyhow!(
                "Failed to create container: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        String::from_utf8_lossy(&output.stdout).trim().to_string()
    };

    // Ensure container is removed at the end
    let _cleanup = scopeguard::guard(container_id.clone(), |id| {
        let _ = Command::new("docker").args(["rm", &id]).output();
    });

    // Export the container
    let output = Command::new("docker")
        .args([
            "export",
            "-o",
            &format!("{}/container.tar", temp_path),
            &container_id,
        ])
        .output()?;

    if !output.status.success() {
        return Err(anyhow!(
            "Failed to export container: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    // Extract the layer files
    // This is a simplified approach - in a real implementation,
    // we would need to identify the specific layer files
    let extract_dir = Path::new(temp_path).join("extracted");
    fs::create_dir_all(&extract_dir)?;

    let output = Command::new("tar")
        .args([
            "-xf",
            &format!("{}/container.tar", temp_path),
            "-C",
            extract_dir.to_str().unwrap(),
        ])
        .output()?;

    if !output.status.success() {
        return Err(anyhow!(
            "Failed to extract container: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok(temp_dir)
}

pub fn diff_layers(layer1_path: &Path, layer2_path: &Path) -> Result<Vec<(String, String)>> {
    let mut differences = Vec::new();

    // Walk through files in layer1
    for entry in walkdir::WalkDir::new(layer1_path) {
        let entry = entry?;
        if entry.file_type().is_file() {
            let rel_path = entry.path().strip_prefix(layer1_path)?;
            let layer2_file = layer2_path.join(rel_path);

            if layer2_file.exists() {
                // Both files exist, compare them
                let content1 = fs::read_to_string(entry.path())?;
                let content2 = fs::read_to_string(&layer2_file)?;

                if content1 != content2 {
                    differences.push((
                        rel_path.to_string_lossy().to_string(),
                        format!("Modified: {}", rel_path.display()),
                    ));
                }
            } else {
                // File exists in layer1 but not in layer2
                differences.push((
                    rel_path.to_string_lossy().to_string(),
                    format!("Removed: {}", rel_path.display()),
                ));
            }
        }
    }

    // Find files that exist only in layer2
    for entry in walkdir::WalkDir::new(layer2_path) {
        let entry = entry?;
        if entry.file_type().is_file() {
            let rel_path = entry.path().strip_prefix(layer2_path)?;
            let layer1_file = layer1_path.join(rel_path);

            if !layer1_file.exists() {
                // File exists in layer2 but not in layer1
                differences.push((
                    rel_path.to_string_lossy().to_string(),
                    format!("Added: {}", rel_path.display()),
                ));
            }
        }
    }

    Ok(differences)
}
