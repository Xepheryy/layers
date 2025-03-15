use anyhow::anyhow;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone)]
pub struct DockerfileInstruction {
pub instruction: String,
pub arguments: String,
pub line_number: usize,
}

#[derive(Debug, Clone)]
pub struct Dockerfile {
pub instructions: Vec<DockerfileInstruction>,
pub path: String,
pub base_image: Option<String>,
}

impl Dockerfile {
pub fn parse(path: &Path) -> Result<Self> {
let content = fs::read_to_string(path)?;
let mut instructions = Vec::new();
let mut base_image = None;

let mut current_instruction = String::new();
let mut current_args = String::new();
let mut line_number = 0;
let mut in_multiline = false;

for (i, line) in content.lines().enumerate() {
let line = line.trim();
line_number = i + 1;

// Skip empty lines and comments
if line.is_empty() || line.starts_with('#') {
continue;
}

if in_multiline {
current_args.push_str(line);

if !line.ends_with('\\') {
in_multiline = false;
instructions.push(DockerfileInstruction {
instruction: current_instruction.clone(),
arguments: current_args.clone(),
line_number,
});

// Check if this is the FROM instruction to extract base image
if current_instruction == "FROM" {
base_image = Some(current_args.clone());
}

current_instruction.clear();
current_args.clear();
} else {
// Remove the trailing backslash and add a space
current_args.pop();
current_args.push(' ');
}
} else {
let parts: Vec<&str> = line.splitn(2, ' ').collect();
if parts.len() < 2 {
continue;
}

let instruction = parts[0].to_uppercase();
let args = parts[1].trim();

if args.ends_with('\\') {
in_multiline = true;
current_instruction = instruction;
current_args = args[..args.len() - 1].to_string() + " ";
} else {
instructions.push(DockerfileInstruction {
instruction: instruction.clone(),
arguments: args.to_string(),
line_number,
});

// Check if this is the FROM instruction to extract base image
if instruction == "FROM" {
base_image = Some(args.to_string());
}
}
}
}

Ok(Dockerfile {
instructions,
path: path.to_string_lossy().to_string(),
base_image,
})
}

pub fn analyze_layer_impact(&self) -> Vec<(String, String)> {
let mut impacts = Vec::new();

for instruction in &self.instructions {
match instruction.instruction.as_str() {
"FROM" => {
impacts.push((
format!("Line {}: {}", instruction.line_number, instruction.instruction),
format!("Base image: {}. Creates a new base layer.", instruction.arguments),
));
}
"RUN" => {
impacts.push((
format!("Line {}: {}", instruction.line_number, instruction.instruction),
format!("Creates a new layer with changes from: {}", instruction.arguments),
));
}
"COPY" | "ADD" => {
impacts.push((
format!("Line {}: {}", instruction.line_number, instruction.instruction),
format!("Creates a new layer with files: {}", instruction.arguments),
));
}
"ENV" | "LABEL" | "WORKDIR" | "USER" | "EXPOSE" | "VOLUME" | "ENTRYPOINT" | "CMD" => {
impacts.push((
format!("Line {}: {}", instruction.line_number, instruction.instruction),
format!("Metadata change only, no new layer: {}", instruction.arguments),
));
}
_ => {
impacts.push((
format!("Line {}: {}", instruction.line_number, instruction.instruction),
format!("Unknown instruction: {}", instruction.arguments),
));
}
}
}

impacts
}

pub fn optimize_suggestions(&self) -> Vec<(String, String)> {
let mut suggestions = Vec::new();
let mut has_multiple_runs = false;
let mut run_instructions = Vec::new();

for instruction in &self.instructions {
if instruction.instruction == "RUN" {
run_instructions.push(instruction);
}
}

if run_instructions.len() > 1 {
has_multiple_runs = true;
suggestions.push((
"Multiple RUN Instructions".to_string(),
format!("Found {} RUN instructions. Consider combining them to reduce layers.", run_instructions.len()),
));
}

// Check for apt-get without cleanup
for instruction in &self.instructions {
if instruction.instruction == "RUN" && instruction.arguments.contains("apt-get install") {
if !instruction.arguments.contains("apt-get clean") && !instruction.arguments.contains("rm -rf /var/lib/apt/lists") {
suggestions.push((
format!("Line {}: Missing cleanup", instruction.line_number),
"apt-get install without cleanup. Add 'apt-get clean && rm -rf /var/lib/apt/lists/*' to reduce layer size.".to_string(),
));
}
}
}

// Check for COPY before RUN
let mut found_copy = false;
let mut found_run_after_copy = false;

for instruction in &self.instructions {
if instruction.instruction == "COPY" || instruction.instruction == "ADD" {
found_copy = true;
} else if found_copy && instruction.instruction == "RUN" {
found_run_after_copy = true;
}
}

if found_run_after_copy {
suggestions.push((
"Dependency Caching".to_string(),
"Consider moving COPY commands for application code after installing dependencies to improve build caching.".to_string(),
));
}

suggestions
}

pub fn analyze(&self) -> Vec<(String, String)> {
// Combine both analysis functions
let mut analysis = Vec::new();

// Get base image information
if let Some(base_img) = &self.base_image {
analysis.push((
"Base Image".to_string(),
format!("Using {} as the base image", base_img),
));
}

// Count instruction types
let mut run_count = 0;
let mut copy_count = 0;
let mut add_count = 0;

for instruction in &self.instructions {
match instruction.instruction.as_str() {
"RUN" => run_count += 1,
"COPY" => copy_count += 1,
"ADD" => add_count += 1,
_ => {}
}
}

if run_count > 0 {
analysis.push(("RUN Instructions".to_string(), format!("Found {} RUN instructions", run_count)));
}

if copy_count > 0 {
analysis.push(("COPY Instructions".to_string(), format!("Found {} COPY instructions", copy_count)));
}

if add_count > 0 {
analysis.push(("ADD Instructions".to_string(), format!("Found {} ADD instructions", add_count)));
}

// Add optimization suggestions
let suggestions = self.optimize_suggestions();
analysis.extend(suggestions);

// Add layer impact analysis
let impacts = self.analyze_layer_impact();
analysis.extend(impacts);

analysis
}
}
