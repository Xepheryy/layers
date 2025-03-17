// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::Emitter;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileItem {
    name: String,
    #[serde(rename = "type")]
    file_type: String,
    path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    size: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DockerLayer {
    id: String,
    name: String,
    command: String,
    size: String,
    createdAt: String,
    files: Vec<FileItem>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DockerImageInfo {
    id: String,
    name: String,
    created: String,
    size: String,
    layers: Vec<DockerLayer>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DockerImage {
    id: String,
    repository: String,
    tag: String,
    created: String,
    size: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DockerfileAnalysisItem {
    line_number: u32,
    instruction: String,
    impact: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DockerfileOptimizationSuggestion {
    title: String,
    description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DockerfileAnalysis {
    layer_impact: Vec<DockerfileAnalysisItem>,
    optimization_suggestions: Vec<DockerfileOptimizationSuggestion>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskStatus {
    message: String,
    progress: f32, // 0.0 to 1.0
    is_complete: bool,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LazyDirectoryInfo {
    path: String,
    is_extracted: bool,
    child_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LayerDiff {
    added: Vec<String>,
    removed: Vec<String>,
    modified: Vec<String>,
    unchanged: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileHash {
    path: String,
    hash: String,
    is_dir: bool,
    size: u64,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn get_docker_images() -> Result<Vec<DockerImage>, String> {
    // Execute docker images command to get list of images
    let output = Command::new("docker")
        .args([
            "images",
            "--format",
            "{{.ID}}|{{.Repository}}|{{.Tag}}|{{.CreatedSince}}|{{.Size}}",
        ])
        .output()
        .map_err(|e| format!("Failed to execute docker command: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "Failed to list docker images: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut images = Vec::new();

    for line in stdout.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        println!("Parts: {:?}", parts);
        if parts.len() >= 5 {
            // Skip images with <none> repository or tag, and also skip images with repository "layers"
            if (parts[1] != "<none>" || parts[2] != "<none>") && parts[1] != "layers" {
                images.push(DockerImage {
                    id: parts[0].to_string(),
                    repository: parts[1].to_string(),
                    tag: parts[2].to_string(),
                    created: parts[3].to_string(),
                    size: parts[4].to_string(),
                });
            }
        }
    }

    Ok(images)
}

#[tauri::command]
async fn retag_image_for_layers(image_id: String) -> Result<String, String> {
    println!("Retagging image with ID: '{}' as layers:latest", image_id);

    if image_id.is_empty() {
        let error = "Image ID is empty".to_string();
        println!("Error: {}", error);
        return Err(error);
    }

    // First, ensure the /tmp/layers directory exists
    let layers_dir = Path::new("/tmp/layers");
    if !layers_dir.exists() {
        println!("Creating layers directory: {:?}", layers_dir);
        fs::create_dir_all(layers_dir)
            .map_err(|e| format!("Failed to create /tmp/layers directory: {}", e))?;
    } else {
        // Clean up any existing files
        println!("Cleaning up layers directory: {:?}", layers_dir);
        fs::remove_dir_all(layers_dir)
            .map_err(|e| format!("Failed to clean up /tmp/layers directory: {}", e))?;
        fs::create_dir_all(layers_dir)
            .map_err(|e| format!("Failed to recreate /tmp/layers directory: {}", e))?;
    }

    // Remove any existing layers:latest tag to avoid conflicts
    println!("Removing any existing layers:latest tag");
    let _ = Command::new("docker")
        .args(["rmi", "layers:latest"])
        .output();
    // Ignore errors as the tag might not exist

    // Tag the image with 'layers' tag
    println!("Tagging image {} as layers:latest", image_id);
    let tag_output = Command::new("docker")
        .args(["tag", &image_id, "layers:latest"])
        .output()
        .map_err(|e| format!("Failed to tag image: {}", e))?;

    if !tag_output.status.success() {
        let error = format!(
            "Failed to tag image: {}",
            String::from_utf8_lossy(&tag_output.stderr)
        );
        println!("Error: {}", error);
        return Err(error);
    }

    // Verify the tag was created
    println!("Verifying tag was created");
    let verify_output = Command::new("docker")
        .args(["images", "layers:latest", "-q"])
        .output()
        .map_err(|e| format!("Failed to verify tag: {}", e))?;

    let tagged_id = String::from_utf8_lossy(&verify_output.stdout)
        .trim()
        .to_string();
    if tagged_id.is_empty() {
        let error = "Failed to verify tag: No image found with tag layers:latest".to_string();
        println!("Error: {}", error);
        return Err(error);
    }

    println!("Successfully tagged image {} as layers:latest", image_id);
    Ok(format!(
        "Successfully tagged image {} as layers:latest",
        image_id
    ))
}

#[tauri::command]
async fn export_image_layers(window: tauri::Window) -> Result<DockerImageInfo, String> {
    println!("Starting export_image_layers");

    // Create a function to update status
    let update_status = |message: &str, progress: f32, is_complete: bool, error: Option<String>| {
        println!(
            "Status update: {}, progress: {}, complete: {}",
            message, progress, is_complete
        );
        let _ = window.emit(
            "task_status",
            TaskStatus {
                message: message.to_string(),
                progress,
                is_complete,
                error,
            },
        );
    };

    update_status("Starting layer export process...", 0.0, false, None);

    // First, ensure the /tmp/layers directory exists
    let layers_dir = Path::new("/tmp/layers");
    println!("Layers directory: {:?}", layers_dir);

    if !layers_dir.exists() {
        println!("Creating layers directory: {:?}", layers_dir);
        fs::create_dir_all(layers_dir)
            .map_err(|e| format!("Failed to create /tmp/layers directory: {}", e))?;
    }

    // Get the image ID for layers:latest
    println!("Getting image ID for layers:latest");
    let image_id_output = Command::new("docker")
        .args(["images", "layers:latest", "-q"])
        .output()
        .map_err(|e| format!("Failed to get image ID: {}", e))?;

    if !image_id_output.status.success() {
        let error = format!(
            "Failed to get image ID: {}",
            String::from_utf8_lossy(&image_id_output.stderr)
        );
        println!("Error: {}", error);
        update_status("Failed to get image ID", 0.0, true, Some(error.clone()));
        return Err(error);
    }

    let image_id = String::from_utf8_lossy(&image_id_output.stdout)
        .trim()
        .to_string();
    if image_id.is_empty() {
        let error = "No image found with tag layers:latest".to_string();
        println!("Error: {}", error);
        update_status(&error, 0.0, true, Some(error.clone()));
        return Err(error);
    }

    println!("Found image ID: {}", image_id);
    update_status("Inspecting image layers...", 0.1, false, None);

    // Get image history to identify layers
    println!("Getting image history");
    let history_output = Command::new("docker")
        .args([
            "history",
            "layers:latest",
            "--no-trunc",
            "--format",
            "{{.ID}}|{{.CreatedSince}}|{{.Size}}|{{.CreatedBy}}",
        ])
        .output()
        .map_err(|e| format!("Failed to get image history: {}", e))?;

    if !history_output.status.success() {
        let error = format!(
            "Failed to get image history: {}",
            String::from_utf8_lossy(&history_output.stderr)
        );
        println!("Error: {}", error);
        update_status(&error, 0.1, true, Some(error.clone()));
        return Err(error);
    }

    let history = String::from_utf8_lossy(&history_output.stdout);
    println!("Image history: {}", history);

    let mut layers = Vec::new();
    let history_lines: Vec<&str> = history.lines().collect();
    let total_layers = history_lines.len();
    println!("Total layers: {}", total_layers);

    if total_layers == 0 {
        let error = "No layers found in the image".to_string();
        println!("Error: {}", error);
        update_status(&error, 0.1, true, Some(error.clone()));
        return Err(error);
    }

    let mut current_layer = 0;

    for line in history_lines {
        current_layer += 1;
        let progress = 0.1 + (0.8 * (current_layer as f32 / total_layers as f32));
        println!("Processing layer {} of {}", current_layer, total_layers);

        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() < 4 {
            println!("Invalid layer data: {}", line);
            continue;
        }

        let layer_id = parts[0].to_string();
        let created = parts[1].to_string();
        let size = parts[2].to_string();
        let command = parts[3].to_string();

        println!("Layer ID: '{}'", layer_id);
        println!("Layer ID length: {}", layer_id.len());
        println!("Created: {}", created);
        println!("Size: {}", size);
        println!("Command: {}", command);

        // Use a generic layer name based on the layer number
        let layer_dir_name = format!("layer_{}", current_layer);
        println!("Using generic layer directory name: {}", layer_dir_name);

        update_status(
            &format!(
                "Processing layer {} of {}: {}",
                current_layer, total_layers, layer_dir_name
            ),
            progress,
            false,
            None,
        );

        // Create a directory for this layer
        let layer_dir = layers_dir.join(&layer_dir_name);
        println!("Layer directory: {:?}", layer_dir);

        if !layer_dir.exists() {
            println!("Creating layer directory: {:?}", layer_dir);
            fs::create_dir_all(&layer_dir)
                .map_err(|e| format!("Failed to create layer directory: {}", e))?;
        }

        // Export layer contents (this is a simplified approach)
        // In a real implementation, you would need to use Docker's API or other methods
        // to extract the actual files from each layer

        // For now, we'll create a mock file structure
        let files = vec![
            FileItem {
                name: "layer_info.txt".to_string(),
                file_type: "file".to_string(),
                path: format!("/tmp/layers/{}/layer_info.txt", layer_dir_name),
                size: Some("1KB".to_string()),
            },
            FileItem {
                name: "command.txt".to_string(),
                file_type: "file".to_string(),
                path: format!("/tmp/layers/{}/command.txt", layer_dir_name),
                size: Some("512B".to_string()),
            },
        ];

        // Write the command to a file
        println!(
            "Writing command to file: {:?}",
            layer_dir.join("command.txt")
        );
        fs::write(layer_dir.join("command.txt"), &command)
            .map_err(|e| format!("Failed to write command file: {}", e))?;

        // Write layer info to a file
        println!(
            "Writing layer info to file: {:?}",
            layer_dir.join("layer_info.txt")
        );
        fs::write(
            layer_dir.join("layer_info.txt"),
            format!(
                "ID: {}\nCreated: {}\nSize: {}\nCommand: {}",
                layer_id, created, size, command
            ),
        )
        .map_err(|e| format!("Failed to write layer info file: {}", e))?;

        layers.push(DockerLayer {
            id: layer_id,
            name: format!("Layer {}", current_layer),
            command,
            size,
            createdAt: created,
            files,
        });
    }

    println!("Layer export completed successfully");
    update_status("Layer export completed successfully", 1.0, true, None);

    // Return the image info with layers
    println!("Returning image info with {} layers", layers.len());
    Ok(DockerImageInfo {
        id: image_id,
        name: "layers:latest".to_string(),
        created: "Now".to_string(), // This would be more accurate in a real implementation
        size: "Unknown".to_string(), // This would be more accurate in a real implementation
        layers,
    })
}

#[tauri::command]
async fn inspect_docker_image(
    image_name: String,
    tag: Option<String>,
) -> Result<DockerImageInfo, String> {
    // First, check if the image exists
    let output = Command::new("docker")
        .args(["image", "ls", &image_name, "--format", "{{.ID}}"])
        .output()
        .map_err(|e| format!("Failed to execute docker command: {}", e))?;

    let image_id = String::from_utf8_lossy(&output.stdout).trim().to_string();

    if image_id.is_empty() {
        // Pull the image if it doesn't exist
        let pull_output = Command::new("docker")
            .args(["pull", &image_name])
            .output()
            .map_err(|e| format!("Failed to pull docker image: {}", e))?;

        if !pull_output.status.success() {
            return Err(format!(
                "Failed to pull image: {}",
                String::from_utf8_lossy(&pull_output.stderr)
            ));
        }
    }

    // Tag the image with 'layers' if requested
    if let Some(tag_value) = tag {
        let tag_name = format!("{}:{}", image_name, tag_value);
        let _ = Command::new("docker")
            .args(["tag", &image_name, &tag_name])
            .output()
            .map_err(|e| format!("Failed to tag image: {}", e))?;
    }

    // Get image details
    let inspect_output = Command::new("docker")
        .args(["image", "inspect", &image_name])
        .output()
        .map_err(|e| format!("Failed to inspect docker image: {}", e))?;

    if !inspect_output.status.success() {
        return Err(format!(
            "Failed to inspect image: {}",
            String::from_utf8_lossy(&inspect_output.stderr)
        ));
    }

    // For now, return mock data
    // In a real implementation, you would parse the JSON output from docker inspect
    Ok(DockerImageInfo {
        id: "sha256:d123456789".to_string(),
        name: image_name,
        created: "2025-03-14T04:25:00Z".to_string(),
        size: "258.2 MB".to_string(),
        layers: vec![
            DockerLayer {
                id: "sha256:a123456789".to_string(),
                name: "Base Layer".to_string(),
                command: "FROM node:16-alpine".to_string(),
                size: "5.8 MB".to_string(),
                createdAt: "2025-03-14T04:23:45Z".to_string(),
                files: vec![
                    FileItem {
                        name: "etc".to_string(),
                        file_type: "directory".to_string(),
                        path: "/etc".to_string(),
                        size: None,
                    },
                    FileItem {
                        name: "usr".to_string(),
                        file_type: "directory".to_string(),
                        path: "/usr".to_string(),
                        size: None,
                    },
                    FileItem {
                        name: "bin".to_string(),
                        file_type: "directory".to_string(),
                        path: "/bin".to_string(),
                        size: None,
                    },
                ],
            },
            DockerLayer {
                id: "sha256:b123456789".to_string(),
                name: "Dependencies".to_string(),
                command: "RUN npm install".to_string(),
                size: "250 MB".to_string(),
                createdAt: "2025-03-14T04:24:15Z".to_string(),
                files: vec![
                    FileItem {
                        name: "node_modules".to_string(),
                        file_type: "directory".to_string(),
                        path: "/app/node_modules".to_string(),
                        size: None,
                    },
                    FileItem {
                        name: "package-lock.json".to_string(),
                        file_type: "file".to_string(),
                        path: "/app/package-lock.json".to_string(),
                        size: Some("250 KB".to_string()),
                    },
                ],
            },
            DockerLayer {
                id: "sha256:c123456789".to_string(),
                name: "App".to_string(),
                command: "COPY . .".to_string(),
                size: "2.4 MB".to_string(),
                createdAt: "2025-03-14T04:24:45Z".to_string(),
                files: vec![
                    FileItem {
                        name: "index.js".to_string(),
                        file_type: "file".to_string(),
                        path: "/app/index.js".to_string(),
                        size: Some("4.5 KB".to_string()),
                    },
                    FileItem {
                        name: "app.js".to_string(),
                        file_type: "file".to_string(),
                        path: "/app/app.js".to_string(),
                        size: Some("12.3 KB".to_string()),
                    },
                    FileItem {
                        name: "public".to_string(),
                        file_type: "directory".to_string(),
                        path: "/app/public".to_string(),
                        size: None,
                    },
                ],
            },
        ],
    })
}

#[tauri::command]
async fn analyze_dockerfile(_content: String) -> Result<DockerfileAnalysis, String> {
    // In a real implementation, you would analyze the Dockerfile content
    // For now, return mock data
    Ok(DockerfileAnalysis {
        layer_impact: vec![
            DockerfileAnalysisItem {
                line_number: 1,
                instruction: "FROM alpine:latest".to_string(),
                impact: "Creates base layer from Alpine Linux (~5MB)".to_string(),
            },
            DockerfileAnalysisItem {
                line_number: 4,
                instruction: "WORKDIR /app".to_string(),
                impact: "Sets working directory for the container".to_string(),
            },
            DockerfileAnalysisItem {
                line_number: 7,
                instruction: "ENV".to_string(),
                impact: "Sets environment variables (negligible size impact)".to_string(),
            },
        ],
        optimization_suggestions: vec![
            DockerfileOptimizationSuggestion {
                title: "Combine RUN commands".to_string(),
                description: "Consider combining the user creation and curl installation into a single RUN command to reduce layers.".to_string(),
            },
            DockerfileOptimizationSuggestion {
                title: "Use multi-stage builds".to_string(),
                description: "For real applications, consider multi-stage builds to keep the final image as small as possible.".to_string(),
            },
        ],
    })
}

#[tauri::command]
async fn cleanup_layers_images() -> Result<String, String> {
    // Remove all images tagged with 'layers'
    let output = Command::new("docker")
        .args(["image", "rm", "layers:latest"])
        .output()
        .map_err(|e| format!("Failed to execute docker command: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "Failed to remove images: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok("Successfully removed all images tagged with 'layers'".to_string())
}

#[tauri::command]
async fn export_single_layer(
    window: tauri::Window,
    layer_id: String,
) -> Result<Vec<FileItem>, String> {
    println!(
        "Exporting layer: '{}', length: {}",
        layer_id,
        layer_id.len()
    );

    // Create a function to update status
    let update_status = |message: &str, progress: f32, is_complete: bool, error: Option<String>| {
        let _ = window.emit(
            "task_status",
            TaskStatus {
                message: message.to_string(),
                progress,
                is_complete,
                error,
            },
        );
    };

    update_status(
        &format!("Exporting layer {}...", &layer_id),
        0.0,
        false,
        None,
    );

    // First, ensure the /tmp/layers directory exists
    let layers_dir = Path::new("/tmp/layers");
    println!("Layers directory: {:?}", layers_dir);

    if !layers_dir.exists() {
        println!("Creating layers directory: {:?}", layers_dir);
        fs::create_dir_all(layers_dir)
            .map_err(|e| format!("Failed to create /tmp/layers directory: {}", e))?;
    }

    // Use a generic layer name
    let layer_dir_name = "current_layer";
    println!("Using generic layer directory name: {}", layer_dir_name);

    // Create a directory for this layer
    let layer_dir = layers_dir.join(layer_dir_name);
    println!("Layer directory: {:?}", layer_dir);

    // Clean up any existing files for this layer
    if layer_dir.exists() {
        println!("Cleaning up existing layer directory: {:?}", layer_dir);
        fs::remove_dir_all(&layer_dir)
            .map_err(|e| format!("Failed to clean up layer directory: {}", e))?;
    }

    println!("Creating layer directory: {:?}", layer_dir);
    fs::create_dir_all(&layer_dir)
        .map_err(|e| format!("Failed to create layer directory: {}", e))?;

    update_status("Extracting layer contents...", 0.3, false, None);

    // Create a temporary container from the layer to extract its contents
    println!("Creating temporary container from layer");

    // First, check if the image with tag layers:latest exists
    let image_check = Command::new("docker")
        .args(["images", "layers:latest", "-q"])
        .output()
        .map_err(|e| format!("Failed to check for layers:latest image: {}", e))?;

    let image_id = String::from_utf8_lossy(&image_check.stdout)
        .trim()
        .to_string();
    if image_id.is_empty() {
        let error =
            "No image found with tag layers:latest. Please select an image first.".to_string();
        println!("Error: {}", error);
        update_status("Error: No image found", 0.0, true, Some(error.clone()));
        return Err(error);
    }

    // Create a temporary container from the image
    let container_name = "layer_export_container";
    println!("Creating container: {}", container_name);

    // Remove any existing container with the same name
    let _ = Command::new("docker")
        .args(["rm", "-f", &container_name])
        .output();

    // Create a new container but don't start it
    let create_output = Command::new("docker")
        .args(["create", "--name", &container_name, "layers:latest", "true"])
        .output()
        .map_err(|e| format!("Failed to create container: {}", e))?;

    if !create_output.status.success() {
        let error = format!(
            "Failed to create container: {}",
            String::from_utf8_lossy(&create_output.stderr)
        );
        println!("Error: {}", error);
        update_status("Error creating container", 0.2, true, Some(error.clone()));
        return Err(error);
    }

    update_status("Extracting layer contents...", 0.3, false, None);

    // Export the container's filesystem
    let tar_path = layer_dir.join("fs.tar");
    println!("Exporting container filesystem to: {:?}", tar_path);

    let export_output = Command::new("docker")
        .args(["export", "-o", &tar_path.to_string_lossy(), &container_name])
        .output()
        .map_err(|e| format!("Failed to export container: {}", e))?;

    if !export_output.status.success() {
        let error = format!(
            "Failed to export container: {}",
            String::from_utf8_lossy(&export_output.stderr)
        );
        println!("Error: {}", error);
        update_status("Error exporting container", 0.4, true, Some(error.clone()));
        return Err(error);
    }

    // Create the extract directory but don't extract everything yet
    let extract_dir = layer_dir.join("fs");
    println!("Creating extract directory: {:?}", extract_dir);

    // Ensure the extract directory exists
    fs::create_dir_all(&extract_dir)
        .map_err(|e| format!("Failed to create extract directory: {}", e))?;

    update_status("Scanning filesystem...", 0.5, false, None);

    // Instead of extracting everything, just list the contents of the tar file
    let list_output = Command::new("tar")
        .args(["-tf", &tar_path.to_string_lossy()])
        .output()
        .map_err(|e| format!("Failed to list tar contents: {}", e))?;

    if !list_output.status.success() {
        let error = format!(
            "Failed to list tar contents: {}",
            String::from_utf8_lossy(&list_output.stderr)
        );
        println!("Error: {}", error);
        update_status("Error scanning filesystem", 0.6, true, Some(error.clone()));
        return Err(error);
    }

    // Extract only the top-level directories to save time and space
    let _extract_top_level = Command::new("tar")
        .args([
            "-xf",
            &tar_path.to_string_lossy(),
            "-C",
            &extract_dir.to_string_lossy(),
            "--no-recursion",
            "--wildcards",
            "*",
            "bin",
            "etc",
            "usr",
            "var",
            "home",
            "root",
            "lib",
            "opt",
            "sbin",
            "srv",
            "tmp",
        ])
        .output()
        .map_err(|e| format!("Failed to extract top-level directories: {}", e))?;

    // Create a file to track which directories have been extracted
    let lazy_info_path = layer_dir.join("lazy_info.json");
    let lazy_dirs = vec![
        LazyDirectoryInfo {
            path: "bin".to_string(),
            is_extracted: false,
            child_count: 0,
        },
        LazyDirectoryInfo {
            path: "etc".to_string(),
            is_extracted: false,
            child_count: 0,
        },
        LazyDirectoryInfo {
            path: "usr".to_string(),
            is_extracted: false,
            child_count: 0,
        },
        LazyDirectoryInfo {
            path: "var".to_string(),
            is_extracted: false,
            child_count: 0,
        },
        LazyDirectoryInfo {
            path: "home".to_string(),
            is_extracted: false,
            child_count: 0,
        },
        LazyDirectoryInfo {
            path: "root".to_string(),
            is_extracted: false,
            child_count: 0,
        },
        LazyDirectoryInfo {
            path: "lib".to_string(),
            is_extracted: false,
            child_count: 0,
        },
        LazyDirectoryInfo {
            path: "opt".to_string(),
            is_extracted: false,
            child_count: 0,
        },
        LazyDirectoryInfo {
            path: "sbin".to_string(),
            is_extracted: false,
            child_count: 0,
        },
        LazyDirectoryInfo {
            path: "srv".to_string(),
            is_extracted: false,
            child_count: 0,
        },
        LazyDirectoryInfo {
            path: "tmp".to_string(),
            is_extracted: false,
            child_count: 0,
        },
    ];

    // Save the lazy loading info
    let lazy_info_json = serde_json::to_string(&lazy_dirs)
        .map_err(|e| format!("Failed to serialize lazy info: {}", e))?;
    fs::write(&lazy_info_path, lazy_info_json)
        .map_err(|e| format!("Failed to write lazy info file: {}", e))?;

    // Clean up the container
    println!("Removing container");
    let _ = Command::new("docker")
        .args(["rm", "-f", &container_name])
        .output();

    // Get layer information
    update_status("Getting layer information...", 0.7, false, None);

    // Get layer command from history
    println!("Getting layer command from history");
    let history_output = Command::new("docker")
        .args([
            "history",
            "layers:latest",
            "--no-trunc",
            "--format",
            "{{.ID}}|{{.CreatedSince}}|{{.Size}}|{{.CreatedBy}}",
        ])
        .output()
        .map_err(|e| format!("Failed to get image history: {}", e))?;

    let history = String::from_utf8_lossy(&history_output.stdout);
    let mut layer_command = "Unknown".to_string();
    let mut layer_created = "Unknown".to_string();
    let mut layer_size = "Unknown".to_string();

    // Parse the layer_id to extract the layer number if it's in the format "layer_X"
    let layer_number = if layer_id.starts_with("layer_") {
        layer_id
            .strip_prefix("layer_")
            .and_then(|num_str| num_str.parse::<usize>().ok())
    } else {
        None
    };

    // If we have a layer number, use it to get the corresponding layer from history
    if let Some(num) = layer_number {
        let history_lines: Vec<&str> = history.lines().collect();

        // Adjust index: layer_1 is the top layer (first in history)
        if num > 0 && num <= history_lines.len() {
            let index = num - 1; // Convert to 0-based index
            if let Some(line) = history_lines.get(index) {
                let parts: Vec<&str> = line.split('|').collect();
                if parts.len() >= 4 {
                    let actual_layer_id = parts[0].to_string();
                    layer_created = parts[1].to_string();
                    layer_size = parts[2].to_string();
                    layer_command = parts[3].to_string();

                    println!("Found layer {} in history: ID={}", num, actual_layer_id);
                }
            }
        }
    } else {
        // Fallback to the original behavior if layer_id is not in the expected format
        for line in history.lines() {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 4 && parts[0].contains(&layer_id) {
                layer_created = parts[1].to_string();
                layer_size = parts[2].to_string();
                layer_command = parts[3].to_string();
                break;
            }
        }
    }

    // Write layer info to a file
    println!("Writing layer info to file");
    fs::write(
        layer_dir.join("layer_info.txt"),
        format!(
            "ID: {}\nCreated: {}\nSize: {}\nCommand: {}",
            layer_id, layer_created, layer_size, layer_command
        ),
    )
    .map_err(|e| format!("Failed to write layer info file: {}", e))?;

    // Write command to a file
    println!("Writing command to file");
    fs::write(layer_dir.join("command.txt"), &layer_command)
        .map_err(|e| format!("Failed to write command file: {}", e))?;

    update_status("Scanning filesystem...", 0.8, false, None);

    // Read the directory and create FileItem objects
    let mut files = Vec::new();

    // Add the layer info and command files
    files.push(FileItem {
        name: "layer_info.txt".to_string(),
        file_type: "file".to_string(),
        path: layer_dir
            .join("layer_info.txt")
            .to_string_lossy()
            .to_string(),
        size: Some("1KB".to_string()),
    });

    files.push(FileItem {
        name: "command.txt".to_string(),
        file_type: "file".to_string(),
        path: layer_dir.join("command.txt").to_string_lossy().to_string(),
        size: Some("512B".to_string()),
    });

    // Add the tar file as a special file
    files.push(FileItem {
        name: "fs.tar".to_string(),
        file_type: "file".to_string(),
        path: tar_path.to_string_lossy().to_string(),
        size: Some(format!(
            "{:.1}MB",
            fs::metadata(&tar_path).map(|m| m.len()).unwrap_or(0) as f64 / (1024.0 * 1024.0)
        )),
    });

    // Function to recursively read a directory and add files to the list
    fn read_dir_recursive(
        dir: &Path,
        files: &mut Vec<FileItem>,
        base_path: &Path,
        max_depth: usize,
        current_depth: usize,
    ) -> Result<(), String> {
        println!("Reading directory: {:?} (depth: {})", dir, current_depth);

        // Check if directory exists
        if !dir.exists() {
            println!("Directory does not exist: {:?}", dir);
            return Ok(()); // Skip this directory but don't fail
        }

        // If we've reached the max depth, just add the directory but don't scan its contents
        if current_depth >= max_depth && max_depth > 0 {
            println!("Reached max depth at {:?}, not scanning contents", dir);

            // Add a placeholder to indicate there are more files
            if let Some(name) = dir.file_name() {
                files.push(FileItem {
                    name: name.to_string_lossy().to_string(),
                    file_type: "directory".to_string(),
                    path: dir.to_string_lossy().to_string(),
                    size: Some("...".to_string()), // Indicate there's more to load
                });
            }

            return Ok(());
        }

        let entries = match fs::read_dir(dir) {
            Ok(entries) => entries,
            Err(e) => {
                println!("Error reading directory {}: {}", dir.display(), e);
                return Ok(()); // Skip this directory but don't fail
            }
        };

        for entry in entries {
            let entry = match entry {
                Ok(entry) => entry,
                Err(e) => {
                    println!("Error reading directory entry: {}", e);
                    continue; // Skip this entry but continue with others
                }
            };

            let path = entry.path();
            let metadata = match fs::metadata(&path) {
                Ok(metadata) => metadata,
                Err(e) => {
                    println!("Error reading file metadata for {:?}: {}", path, e);
                    continue; // Skip this entry but continue with others
                }
            };

            let file_name = match path.file_name() {
                Some(name) => name.to_string_lossy().to_string(),
                None => {
                    println!("Invalid file name for {:?}", path);
                    continue; // Skip this entry but continue with others
                }
            };

            let file_type = if metadata.is_dir() {
                "directory"
            } else {
                "file"
            };

            let size = if metadata.is_file() {
                let size_bytes = metadata.len();
                if size_bytes < 1024 {
                    Some(format!("{}B", size_bytes))
                } else if size_bytes < 1024 * 1024 {
                    Some(format!("{:.1}KB", size_bytes as f64 / 1024.0))
                } else {
                    Some(format!("{:.1}MB", size_bytes as f64 / (1024.0 * 1024.0)))
                }
            } else {
                None
            };

            println!("Adding file: {} ({})", file_name, file_type);
            files.push(FileItem {
                name: file_name,
                file_type: file_type.to_string(),
                path: path.to_string_lossy().to_string(),
                size,
            });

            // Recursively process subdirectories
            if metadata.is_dir() && (max_depth == 0 || current_depth < max_depth) {
                if let Err(e) =
                    read_dir_recursive(&path, files, base_path, max_depth, current_depth + 1)
                {
                    println!("Warning: {}", e);
                    // Continue anyway, this is not critical
                }
            }
        }

        Ok(())
    }

    // Read the extracted filesystem directory with a depth limit
    println!("Reading extracted filesystem directory: {:?}", extract_dir);
    if let Err(e) = read_dir_recursive(&extract_dir, &mut files, &extract_dir, 2, 0) {
        println!("Warning: {}", e);
        // Continue anyway, we still have the layer info and command files
    }

    update_status(&format!("Layer exported successfully"), 1.0, true, None);

    println!("Successfully exported layer");
    println!("Returning {} files", files.len());
    Ok(files)
}

#[tauri::command]
async fn extract_directory(dir_path: String, layer_id: String) -> Result<Vec<FileItem>, String> {
    println!("Extracting directory: {}", dir_path);

    // Ensure the directory path is valid
    let path = Path::new(&dir_path);
    if !path.exists() {
        return Err(format!("Directory does not exist: {}", dir_path));
    }

    // Get the layer directory
    let layers_dir = Path::new("/tmp/layers");
    let layer_dir_name = "current_layer";
    let layer_dir = layers_dir.join(layer_dir_name);
    let tar_path = layer_dir.join("fs.tar");

    // Check if the tar file exists
    if !tar_path.exists() {
        return Err(format!("Tar file does not exist: {:?}", tar_path));
    }

    // Get the relative path from the extract directory
    let extract_dir = layer_dir.join("fs");
    let rel_path = match path.strip_prefix(&extract_dir) {
        Ok(p) => p.to_string_lossy().to_string(),
        Err(_) => {
            // If the path is not under the extract directory, it might be a direct path like "etc" or "usr"
            match path.file_name() {
                Some(name) => name.to_string_lossy().to_string(),
                None => return Err("Invalid directory path".to_string()),
            }
        }
    };

    println!("Relative path: {}", rel_path);

    // Extract the specific directory from the tar file with all its contents
    let extract_output = Command::new("tar")
        .args([
            "-xf",
            &tar_path.to_string_lossy(),
            "-C",
            &extract_dir.to_string_lossy(),
            &format!("{}*", if rel_path.is_empty() { "" } else { &rel_path }),
        ])
        .output()
        .map_err(|e| format!("Failed to extract directory: {}", e))?;

    if !extract_output.status.success() {
        let error = format!(
            "Failed to extract directory: {}",
            String::from_utf8_lossy(&extract_output.stderr)
        );
        println!("Error: {}", error);
        return Err(error);
    }

    // Read the directory contents recursively
    let mut files = Vec::new();

    fn read_dir_recursive(
        dir: &Path,
        files: &mut Vec<FileItem>,
        base_path: &Path,
    ) -> Result<(), String> {
        println!("Reading directory: {:?}", dir);

        // Check if directory exists
        if !dir.exists() {
            println!("Directory does not exist: {:?}", dir);
            return Ok(()); // Skip this directory but don't fail
        }

        let entries = match fs::read_dir(dir) {
            Ok(entries) => entries,
            Err(e) => {
                println!("Error reading directory {}: {}", dir.display(), e);
                return Ok(()); // Skip this directory but don't fail
            }
        };

        for entry in entries {
            let entry = match entry {
                Ok(entry) => entry,
                Err(e) => {
                    println!("Error reading directory entry: {}", e);
                    continue; // Skip this entry but continue with others
                }
            };

            let path = entry.path();
            let metadata = match fs::metadata(&path) {
                Ok(metadata) => metadata,
                Err(e) => {
                    println!("Error reading file metadata for {:?}: {}", path, e);
                    continue; // Skip this entry but continue with others
                }
            };

            let file_name = match path.file_name() {
                Some(name) => name.to_string_lossy().to_string(),
                None => {
                    println!("Invalid file name for {:?}", path);
                    continue; // Skip this entry but continue with others
                }
            };

            let file_type = if metadata.is_dir() {
                "directory"
            } else {
                "file"
            };

            let size = if metadata.is_file() {
                let size_bytes = metadata.len();
                if size_bytes < 1024 {
                    Some(format!("{}B", size_bytes))
                } else if size_bytes < 1024 * 1024 {
                    Some(format!("{:.1}KB", size_bytes as f64 / 1024.0))
                } else {
                    Some(format!("{:.1}MB", size_bytes as f64 / (1024.0 * 1024.0)))
                }
            } else {
                None
            };

            println!("Adding file: {} ({})", file_name, file_type);
            files.push(FileItem {
                name: file_name,
                file_type: file_type.to_string(),
                path: path.to_string_lossy().to_string(),
                size,
            });

            // Recursively process subdirectories
            if metadata.is_dir() {
                if let Err(e) = read_dir_recursive(&path, files, base_path) {
                    println!("Warning: {}", e);
                    // Continue anyway, this is not critical
                }
            }
        }

        Ok(())
    }

    // Read the extracted directory recursively
    read_dir_recursive(path, &mut files, &extract_dir)
        .map_err(|e| format!("Failed to read directory contents: {}", e))?;

    println!(
        "Successfully extracted directory, found {} files",
        files.len()
    );
    Ok(files)
}

#[tauri::command]
async fn get_layer_files(layer_id: String) -> Result<Vec<FileItem>, String> {
    println!("Getting files for layer: '{}'", layer_id);

    // Use a generic layer name
    let layer_dir_name = "current_layer";
    println!("Using generic layer directory name: {}", layer_dir_name);

    let layer_dir = Path::new("/tmp/layers").join(layer_dir_name);
    println!("Layer directory: {:?}", layer_dir);

    if !layer_dir.exists() {
        println!("Layer directory does not exist: {:?}", layer_dir);
        return Err(format!("Layer directory does not exist"));
    }

    // Read the directory and create FileItem objects
    let mut files = Vec::new();

    // Add special metadata files
    files.push(FileItem {
        name: "layer_info.txt".to_string(),
        file_type: "file".to_string(),
        path: layer_dir
            .join("layer_info.txt")
            .to_string_lossy()
            .to_string(),
        size: Some("1KB".to_string()),
    });

    files.push(FileItem {
        name: "command.txt".to_string(),
        file_type: "file".to_string(),
        path: layer_dir.join("command.txt").to_string_lossy().to_string(),
        size: Some("512B".to_string()),
    });

    // Check if we have a tar file
    let tar_path = layer_dir.join("fs.tar");
    let extract_dir = layer_dir.join("fs");

    if tar_path.exists() {
        println!("Found tar file, scanning contents");

        // Create the extract directory if it doesn't exist
        if !extract_dir.exists() {
            fs::create_dir_all(&extract_dir)
                .map_err(|e| format!("Failed to create extract directory: {}", e))?;
        }

        // List all entries in the tar file
        let list_output = Command::new("tar")
            .args(["-tf", &tar_path.to_string_lossy()])
            .output()
            .map_err(|e| format!("Failed to list tar contents: {}", e))?;

        if !list_output.status.success() {
            let error = format!(
                "Failed to list tar contents: {}",
                String::from_utf8_lossy(&list_output.stderr)
            );
            println!("Error: {}", error);
            return Err(error);
        }

        // Parse the output to get all file paths
        let tar_contents = String::from_utf8_lossy(&list_output.stdout);
        let mut path_map: std::collections::HashMap<String, bool> =
            std::collections::HashMap::new();

        // First pass: collect all paths and mark them as files or directories
        for line in tar_contents.lines() {
            let path = line.trim();
            if path.is_empty() {
                continue;
            }

            // Skip special entries like "./" or "."
            if path == "./" || path == "." {
                continue;
            }

            // Determine if it's a directory (ends with /)
            let is_dir = path.ends_with('/');
            let clean_path = if is_dir {
                path.trim_end_matches('/')
            } else {
                path
            };

            // Add to map
            path_map.insert(clean_path.to_string(), is_dir);

            // Also add all parent directories
            let mut parent_path = Path::new(clean_path);
            while let Some(parent) = parent_path.parent() {
                if parent.to_string_lossy() == "." || parent.to_string_lossy().is_empty() {
                    break;
                }
                path_map.insert(parent.to_string_lossy().to_string(), true);
                parent_path = parent;
            }
        }

        // Second pass: create FileItem objects for all paths
        for (path, is_dir) in path_map {
            // Skip root
            if path.is_empty() || path == "." {
                continue;
            }

            let full_path = extract_dir.join(&path);
            let name = match Path::new(&path).file_name() {
                Some(name) => name.to_string_lossy().to_string(),
                None => continue,
            };

            // Check if the file/directory has been extracted
            let exists = full_path.exists();

            // For directories, check if they need to be loaded
            let needs_loading = is_dir && !exists;

            // For files, only include if they exist or their parent directory needs loading
            if !is_dir && !exists {
                // If the file doesn't exist, check if its parent directory needs loading
                if let Some(parent) = Path::new(&path).parent() {
                    let parent_path = extract_dir.join(parent);
                    if !parent_path.exists() {
                        // Parent directory needs to be loaded first, so skip this file for now
                        continue;
                    }
                }
            }

            // Get size for existing files
            let size = if !is_dir && exists {
                match fs::metadata(&full_path) {
                    Ok(metadata) => {
                        let size_bytes = metadata.len();
                        if size_bytes < 1024 {
                            Some(format!("{}B", size_bytes))
                        } else if size_bytes < 1024 * 1024 {
                            Some(format!("{:.1}KB", size_bytes as f64 / 1024.0))
                        } else {
                            Some(format!("{:.1}MB", size_bytes as f64 / (1024.0 * 1024.0)))
                        }
                    }
                    Err(_) => Some("unknown".to_string()),
                }
            } else if needs_loading {
                Some("click to load".to_string())
            } else {
                None
            };

            // Create the FileItem
            let file_item = FileItem {
                name,
                file_type: if is_dir { "directory" } else { "file" }.to_string(),
                path: full_path.to_string_lossy().to_string(),
                size,
            };

            files.push(file_item);
        }
    } else {
        // No tar file, fall back to the old behavior
        // Function to recursively read a directory and add files to the list
        fn read_dir_recursive(
            dir: &Path,
            files: &mut Vec<FileItem>,
            base_path: &Path,
        ) -> Result<(), String> {
            println!("Reading directory: {:?}", dir);

            // Check if directory exists
            if !dir.exists() {
                println!("Directory does not exist: {:?}", dir);
                return Ok(()); // Skip this directory but don't fail
            }

            let entries = match fs::read_dir(dir) {
                Ok(entries) => entries,
                Err(e) => {
                    println!("Error reading directory {}: {}", dir.display(), e);
                    return Ok(()); // Skip this directory but don't fail
                }
            };

            for entry in entries {
                let entry = match entry {
                    Ok(entry) => entry,
                    Err(e) => {
                        println!("Error reading directory entry: {}", e);
                        continue; // Skip this entry but continue with others
                    }
                };

                let path = entry.path();
                let metadata = match fs::metadata(&path) {
                    Ok(metadata) => metadata,
                    Err(e) => {
                        println!("Error reading file metadata for {:?}: {}", path, e);
                        continue; // Skip this entry but continue with others
                    }
                };

                let file_name = match path.file_name() {
                    Some(name) => name.to_string_lossy().to_string(),
                    None => {
                        println!("Invalid file name for {:?}", path);
                        continue; // Skip this entry but continue with others
                    }
                };

                let file_type = if metadata.is_dir() {
                    "directory"
                } else {
                    "file"
                };

                let size = if metadata.is_file() {
                    let size_bytes = metadata.len();
                    if size_bytes < 1024 {
                        Some(format!("{}B", size_bytes))
                    } else if size_bytes < 1024 * 1024 {
                        Some(format!("{:.1}KB", size_bytes as f64 / 1024.0))
                    } else {
                        Some(format!("{:.1}MB", size_bytes as f64 / (1024.0 * 1024.0)))
                    }
                } else {
                    None
                };

                println!("Adding file: {} ({})", file_name, file_type);
                files.push(FileItem {
                    name: file_name,
                    file_type: file_type.to_string(),
                    path: path.to_string_lossy().to_string(),
                    size,
                });

                // Recursively process subdirectories
                if metadata.is_dir() {
                    if let Err(e) = read_dir_recursive(&path, files, base_path) {
                        println!("Warning: {}", e);
                        // Continue anyway, this is not critical
                    }
                }
            }

            Ok(())
        }

        // Read the layer directory recursively
        println!("Reading layer directory: {:?}", layer_dir);
        if let Err(e) = read_dir_recursive(&layer_dir, &mut files, &layer_dir) {
            println!("Warning: {}", e);
            // Continue anyway, we might still have some files
        }
    }

    println!("Returning {} files", files.len());
    Ok(files)
}

#[tauri::command]
async fn read_layer_file(file_path: String) -> Result<String, String> {
    println!("Reading file content from: {}", file_path);

    // Check if the file exists
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }

    // Check if it's a file (not a directory)
    let metadata =
        fs::metadata(path).map_err(|e| format!("Failed to read file metadata: {}", e))?;

    if !metadata.is_file() {
        return Err(format!("Path is not a file: {}", file_path));
    }

    // Check file size
    let file_size = metadata.len();
    if file_size > 10 * 1024 * 1024 {
        // 10MB limit
        return Err(format!(
            "File is too large to display: {} ({} bytes)",
            file_path, file_size
        ));
    }

    // First read the file as bytes to check if it's binary
    let bytes = fs::read(path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Check if the file is likely binary by looking for null bytes or high concentration of non-ASCII characters
    let is_likely_binary = is_binary_content(&bytes);

    if is_likely_binary {
        return Err(format!("Cannot display binary file: {}", file_path));
    }

    // Convert bytes to string
    match String::from_utf8(bytes) {
        Ok(content) => {
            println!(
                "Successfully read file content, length: {} bytes",
                content.len()
            );
            Ok(content)
        }
        Err(_) => Err(
            "File contains invalid UTF-8 characters and cannot be displayed as text".to_string(),
        ),
    }
}

// Helper function to determine if content is likely binary
fn is_binary_content(bytes: &[u8]) -> bool {
    // If we find a null byte, it's definitely binary
    if bytes.contains(&0) {
        return true;
    }

    // Count non-ASCII characters
    let non_ascii_count = bytes.iter().filter(|&&b| b > 127).count();

    // If more than 30% of the first 1000 bytes are non-ASCII, consider it binary
    if bytes.len() > 0 {
        let sample_size = std::cmp::min(bytes.len(), 1000);
        let ratio = non_ascii_count as f64 / sample_size as f64;
        return ratio > 0.3;
    }

    false
}

#[tauri::command]
async fn compare_layers(
    window: tauri::Window,
    layer1_id: String,
    layer2_id: String,
) -> Result<LayerDiff, String> {
    println!("Comparing layers: {} and {}", layer1_id, layer2_id);

    // Create a function to update status
    let update_status = |message: &str, progress: f32, is_complete: bool, error: Option<String>| {
        let _ = window.emit(
            "task_status",
            TaskStatus {
                message: message.to_string(),
                progress,
                is_complete,
                error,
            },
        );
    };

    update_status(
        &format!(
            "Preparing to compare layers {} and {}...",
            &layer1_id, &layer2_id
        ),
        0.0,
        false,
        None,
    );

    // Extract layer numbers from IDs
    let layer1_num = layer1_id
        .strip_prefix("layer_")
        .and_then(|s| s.parse::<usize>().ok())
        .ok_or_else(|| "Invalid layer1_id format".to_string())?;

    let layer2_num = layer2_id
        .strip_prefix("layer_")
        .and_then(|s| s.parse::<usize>().ok())
        .ok_or_else(|| "Invalid layer2_id format".to_string())?;

    // Ensure layer directories exist
    let layers_dir = Path::new("/tmp/layers");

    // Check if we need to export the layers first
    let layer1_dir = layers_dir.join(&layer1_id);
    let layer2_dir = layers_dir.join(&layer2_id);

    if !layer1_dir.exists() || !layer1_dir.join("fs.tar").exists() {
        update_status(
            &format!("Exporting layer {}...", &layer1_id),
            0.1,
            false,
            None,
        );

        // Export the first layer
        export_single_layer(window.clone(), layer1_id.clone()).await?;
    }

    if !layer2_dir.exists() || !layer2_dir.join("fs.tar").exists() {
        update_status(
            &format!("Exporting layer {}...", &layer2_id),
            0.3,
            false,
            None,
        );

        // Export the second layer
        export_single_layer(window.clone(), layer2_id.clone()).await?;
    }

    update_status(
        "Creating temporary directories for comparison...",
        0.5,
        false,
        None,
    );

    // Create temporary directories for each layer's filesystem
    let temp_dir = layers_dir.join("diff_temp");
    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir)
            .map_err(|e| format!("Failed to clean up temp directory: {}", e))?;
    }
    fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp directory: {}", e))?;

    let layer1_extract_dir = temp_dir.join(format!("layer{}", layer1_num));
    let layer2_extract_dir = temp_dir.join(format!("layer{}", layer2_num));

    fs::create_dir_all(&layer1_extract_dir)
        .map_err(|e| format!("Failed to create layer1 extract directory: {}", e))?;
    fs::create_dir_all(&layer2_extract_dir)
        .map_err(|e| format!("Failed to create layer2 extract directory: {}", e))?;

    // Extract both layers' filesystems
    update_status(
        &format!("Extracting layer {}...", layer1_num),
        0.6,
        false,
        None,
    );
    extract_layer_for_diff(layer1_id.clone(), &layer1_extract_dir)?;

    update_status(
        &format!("Extracting layer {}...", layer2_num),
        0.7,
        false,
        None,
    );
    extract_layer_for_diff(layer2_id.clone(), &layer2_extract_dir)?;

    // Compute hashes for both layers
    update_status(
        &format!("Computing hashes for layer {}...", layer1_num),
        0.8,
        false,
        None,
    );
    let layer1_hashes = compute_directory_hashes(&layer1_extract_dir)?;

    update_status(
        &format!("Computing hashes for layer {}...", layer2_num),
        0.9,
        false,
        None,
    );
    let layer2_hashes = compute_directory_hashes(&layer2_extract_dir)?;

    // Compare the hashes to find differences
    update_status("Comparing layer contents...", 0.95, false, None);
    let diff = compare_hashes(layer1_hashes, layer2_hashes);

    // Clean up temporary directories
    let _ = fs::remove_dir_all(&temp_dir);

    update_status("Comparison complete", 1.0, true, None);
    Ok(diff)
}

fn extract_layer_for_diff(layer_id: String, extract_dir: &Path) -> Result<(), String> {
    // Get the layer directory
    let layers_dir = Path::new("/tmp/layers");
    let layer_dir_name = format!(
        "layer_{}",
        layer_id.strip_prefix("layer_").unwrap_or(&layer_id)
    );
    let layer_dir = layers_dir.join(&layer_dir_name);
    let tar_path = layer_dir.join("fs.tar");

    // Check if the tar file exists
    if !tar_path.exists() {
        println!(
            "Tar file does not exist for layer {}, generating it...",
            layer_id
        );

        // Create a temporary container from the image to extract its contents
        // First, check if the image with tag layers:latest exists
        let image_check = Command::new("docker")
            .args(["images", "layers:latest", "-q"])
            .output()
            .map_err(|e| format!("Failed to check for layers:latest image: {}", e))?;

        let image_id = String::from_utf8_lossy(&image_check.stdout)
            .trim()
            .to_string();
        if image_id.is_empty() {
            return Err(
                "No image found with tag layers:latest. Please select an image first.".to_string(),
            );
        }

        // Create a temporary container from the image
        let container_name = format!("layer_diff_container_{}", layer_id);
        println!("Creating container: {}", container_name);

        // Remove any existing container with the same name
        let _ = Command::new("docker")
            .args(["rm", "-f", &container_name])
            .output();

        // Create a new container but don't start it
        let create_output = Command::new("docker")
            .args(["create", "--name", &container_name, "layers:latest", "true"])
            .output()
            .map_err(|e| format!("Failed to create container: {}", e))?;

        if !create_output.status.success() {
            let error = format!(
                "Failed to create container: {}",
                String::from_utf8_lossy(&create_output.stderr)
            );
            println!("Error: {}", error);
            return Err(error);
        }

        // Ensure the layer directory exists
        if !layer_dir.exists() {
            fs::create_dir_all(&layer_dir)
                .map_err(|e| format!("Failed to create layer directory: {}", e))?;
        }

        // Export the container's filesystem
        println!("Exporting container filesystem to: {:?}", tar_path);

        let export_output = Command::new("docker")
            .args(["export", "-o", &tar_path.to_string_lossy(), &container_name])
            .output()
            .map_err(|e| format!("Failed to export container: {}", e))?;

        if !export_output.status.success() {
            let error = format!(
                "Failed to export container: {}",
                String::from_utf8_lossy(&export_output.stderr)
            );
            println!("Error: {}", error);
            return Err(error);
        }

        // Clean up the container
        println!("Removing container");
        let _ = Command::new("docker")
            .args(["rm", "-f", &container_name])
            .output();
    }

    // Extract the tar file to the extract directory
    let extract_output = Command::new("tar")
        .args([
            "-xf",
            &tar_path.to_string_lossy(),
            "-C",
            &extract_dir.to_string_lossy(),
        ])
        .output()
        .map_err(|e| format!("Failed to extract layer {}: {}", layer_id, e))?;

    if !extract_output.status.success() {
        return Err(format!(
            "Failed to extract layer {}: {}",
            layer_id,
            String::from_utf8_lossy(&extract_output.stderr)
        ));
    }

    Ok(())
}

fn compute_directory_hashes(dir: &Path) -> Result<Vec<FileHash>, String> {
    let mut hashes = Vec::new();
    compute_hashes_recursive(dir, dir, &mut hashes)?;
    Ok(hashes)
}

fn compute_hashes_recursive(
    base_dir: &Path,
    current_dir: &Path,
    hashes: &mut Vec<FileHash>,
) -> Result<(), String> {
    let entries = fs::read_dir(current_dir)
        .map_err(|e| format!("Failed to read directory {:?}: {}", current_dir, e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();
        let metadata = fs::metadata(&path)
            .map_err(|e| format!("Failed to read metadata for {:?}: {}", path, e))?;

        // Get relative path from base directory
        let rel_path = path
            .strip_prefix(base_dir)
            .map_err(|e| format!("Failed to get relative path: {}", e))?
            .to_string_lossy()
            .to_string();

        if metadata.is_dir() {
            // For directories, just record their existence and recurse
            hashes.push(FileHash {
                path: rel_path,
                hash: "directory".to_string(),
                is_dir: true,
                size: 0,
            });

            compute_hashes_recursive(base_dir, &path, hashes)?;
        } else if metadata.is_file() {
            // For files, compute a hash
            let hash = compute_file_hash(&path)?;

            hashes.push(FileHash {
                path: rel_path,
                hash,
                is_dir: false,
                size: metadata.len(),
            });
        }
    }

    Ok(())
}

fn compute_file_hash(path: &Path) -> Result<String, String> {
    // For small files (< 1MB), hash the entire content
    // For larger files, hash the first 4KB, last 4KB, and file size
    // This is a compromise between accuracy and performance

    let metadata =
        fs::metadata(path).map_err(|e| format!("Failed to read metadata for {:?}: {}", path, e))?;

    let file_size = metadata.len();

    // Use a simple hash based on file size for very large files
    if file_size > 10 * 1024 * 1024 {
        // 10MB
        return Ok(format!("size:{}", file_size));
    }

    // For smaller files, read portions of the file
    let mut file =
        fs::File::open(path).map_err(|e| format!("Failed to open file {:?}: {}", path, e))?;

    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    use std::io::{Read, Seek, SeekFrom};

    let mut hasher = DefaultHasher::new();

    // Hash file size
    file_size.hash(&mut hasher);

    // Hash first 4KB
    let mut buffer = [0u8; 4096];
    let bytes_read = file
        .read(&mut buffer)
        .map_err(|e| format!("Failed to read file {:?}: {}", path, e))?;

    if bytes_read > 0 {
        buffer[..bytes_read].hash(&mut hasher);
    }

    // If file is larger than 8KB, also hash last 4KB
    if file_size > 8192 {
        file.seek(SeekFrom::End(-4096))
            .map_err(|e| format!("Failed to seek in file {:?}: {}", path, e))?;

        let bytes_read = file
            .read(&mut buffer)
            .map_err(|e| format!("Failed to read file {:?}: {}", path, e))?;

        if bytes_read > 0 {
            buffer[..bytes_read].hash(&mut hasher);
        }
    }

    Ok(format!("{:x}", hasher.finish()))
}

fn compare_hashes(layer1_hashes: Vec<FileHash>, layer2_hashes: Vec<FileHash>) -> LayerDiff {
    use std::collections::HashMap;

    // Create maps for easier lookup
    let mut layer1_map: HashMap<String, FileHash> = HashMap::new();
    for hash in layer1_hashes {
        layer1_map.insert(hash.path.clone(), hash);
    }

    let mut layer2_map: HashMap<String, FileHash> = HashMap::new();
    for hash in layer2_hashes {
        layer2_map.insert(hash.path.clone(), hash);
    }

    let mut added = Vec::new();
    let mut removed = Vec::new();
    let mut modified = Vec::new();
    let mut unchanged = Vec::new();

    // Find files in layer2 that are not in layer1 (added)
    // or are in both but different (modified)
    for (path, hash2) in &layer2_map {
        if let Some(hash1) = layer1_map.get(path) {
            if hash1.hash != hash2.hash || hash1.size != hash2.size {
                modified.push(path.clone());
            } else {
                unchanged.push(path.clone());
            }
        } else {
            added.push(path.clone());
        }
    }

    // Find files in layer1 that are not in layer2 (removed)
    for path in layer1_map.keys() {
        if !layer2_map.contains_key(path) {
            removed.push(path.clone());
        }
    }

    // Sort the results for consistency
    added.sort();
    removed.sort();
    modified.sort();
    unchanged.sort();

    LayerDiff {
        added,
        removed,
        modified,
        unchanged,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            inspect_docker_image,
            analyze_dockerfile,
            cleanup_layers_images,
            get_docker_images,
            retag_image_for_layers,
            export_image_layers,
            export_single_layer,
            get_layer_files,
            read_layer_file,
            extract_directory,
            compare_layers
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
