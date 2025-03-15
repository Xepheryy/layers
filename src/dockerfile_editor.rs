use anyhow::Result;
use gpui::{div, prelude::*, rgb, FontWeight, IntoElement};
use regex::Regex;
use std::collections::HashMap;

/// Define tooltip information for Dockerfile commands
pub struct DockerfileCommand {
    pub description: String,
    pub side_effect: String,
    pub example: String,
}

/// Map of Dockerfile commands to their tooltip information
pub fn get_dockerfile_commands() -> HashMap<String, DockerfileCommand> {
    let mut commands = HashMap::new();

    commands.insert(
        "FROM".to_string(),
        DockerfileCommand {
            description: "Sets the base image for subsequent instructions.".to_string(),
            side_effect: "Creates a new build stage and sets the base image.".to_string(),
            example: "FROM ubuntu:20.04".to_string(),
        },
    );

    commands.insert(
        "RUN".to_string(),
        DockerfileCommand {
            description: "Executes commands in a new layer on top of the current image."
                .to_string(),
            side_effect: "Creates a new layer in the image with the results of the command."
                .to_string(),
            example: "RUN apt-get update && apt-get install -y curl".to_string(),
        },
    );

    commands.insert(
        "CMD".to_string(),
        DockerfileCommand {
            description: "Provides default commands for an executing container.".to_string(),
            side_effect: "Sets the command to run when the container starts.".to_string(),
            example: "CMD [\"echo\", \"Hello World\"]".to_string(),
        },
    );

    commands.insert(
        "LABEL".to_string(),
        DockerfileCommand {
            description: "Adds metadata to an image as key-value pairs.".to_string(),
            side_effect: "Adds metadata to the image.".to_string(),
            example: "LABEL version=\"1.0\" description=\"This is my container\"".to_string(),
        },
    );

    commands.insert("EXPOSE".to_string(), DockerfileCommand {
        description: "Informs Docker that the container listens on the specified network ports at runtime.".to_string(),
        side_effect: "Documents which ports are intended to be published.".to_string(),
        example: "EXPOSE 80/tcp".to_string(),
    });

    commands.insert(
        "ENV".to_string(),
        DockerfileCommand {
            description: "Sets environment variables for subsequent instructions.".to_string(),
            side_effect: "Sets environment variables that persist when a container is run."
                .to_string(),
            example: "ENV PATH=/usr/local/bin:$PATH".to_string(),
        },
    );

    commands.insert("ADD".to_string(), DockerfileCommand {
        description: "Copies new files, directories, or remote file URLs to the filesystem of the container.".to_string(),
        side_effect: "Adds files to the image, can unpack compressed files and fetch remote URLs.".to_string(),
        example: "ADD hom* /mydir/".to_string(),
    });

    commands.insert(
        "COPY".to_string(),
        DockerfileCommand {
            description: "Copies new files or directories to the filesystem of the container."
                .to_string(),
            side_effect: "Adds files to the image (simpler than ADD, preferred for most cases)."
                .to_string(),
            example: "COPY . /app".to_string(),
        },
    );

    commands.insert(
        "ENTRYPOINT".to_string(),
        DockerfileCommand {
            description: "Configures a container to run as an executable.".to_string(),
            side_effect: "Sets the primary command that is executed when the container starts."
                .to_string(),
            example: "ENTRYPOINT [\"nginx\", \"-g\", \"daemon off;\"]".to_string(),
        },
    );

    commands.insert(
        "VOLUME".to_string(),
        DockerfileCommand {
            description: "Creates a mount point with the specified name.".to_string(),
            side_effect: "Creates a mount point and marks it to hold externally mounted volumes."
                .to_string(),
            example: "VOLUME [\"/data\"]".to_string(),
        },
    );

    commands.insert(
        "USER".to_string(),
        DockerfileCommand {
            description: "Sets the user name or UID to use when running the image.".to_string(),
            side_effect:
                "Changes the user for subsequent instructions and when running the container."
                    .to_string(),
            example: "USER www-data".to_string(),
        },
    );

    commands.insert("WORKDIR".to_string(), DockerfileCommand {
        description: "Sets the working directory for subsequent instructions.".to_string(),
        side_effect: "Changes the working directory for subsequent instructions and when running the container.".to_string(),
        example: "WORKDIR /app".to_string(),
    });

    commands.insert(
        "ARG".to_string(),
        DockerfileCommand {
            description: "Defines a variable that users can pass at build-time.".to_string(),
            side_effect:
                "Defines a build-time variable that can be passed with docker build --build-arg."
                    .to_string(),
            example: "ARG VERSION=latest".to_string(),
        },
    );

    commands.insert("ONBUILD".to_string(), DockerfileCommand {
        description: "Adds a trigger instruction to be executed when the image is used as the base for another build.".to_string(),
        side_effect: "Registers a build instruction to be executed later, when the image is used as a base.".to_string(),
        example: "ONBUILD ADD . /app/src".to_string(),
    });

    commands.insert(
        "STOPSIGNAL".to_string(),
        DockerfileCommand {
            description: "Sets the system call signal that will be sent to the container to exit."
                .to_string(),
            side_effect: "Sets the signal that will be used to stop the container.".to_string(),
            example: "STOPSIGNAL SIGTERM".to_string(),
        },
    );

    commands.insert(
        "HEALTHCHECK".to_string(),
        DockerfileCommand {
            description: "Tells Docker how to test a container to check that it is still working."
                .to_string(),
            side_effect: "Configures a command to run periodically to check container health."
                .to_string(),
            example:
                "HEALTHCHECK --interval=5m --timeout=3s CMD curl -f http://localhost/ || exit 1"
                    .to_string(),
        },
    );

    commands.insert(
        "SHELL".to_string(),
        DockerfileCommand {
            description: "Overrides the default shell used for the shell form of commands."
                .to_string(),
            side_effect: "Changes the default shell used for shell commands.".to_string(),
            example: "SHELL [\"/bin/bash\", \"-c\"]".to_string(),
        },
    );

    commands
}

/// Parse Dockerfile content into blocks based on instructions
pub fn parse_dockerfile_blocks(content: &str) -> Vec<(usize, usize, String)> {
    let mut blocks = Vec::new();
    let mut current_block_start = 0;
    let mut current_instruction = String::new();

    // Regular expression to match Dockerfile instructions
    let re = Regex::new(r"^\s*(FROM|RUN|CMD|LABEL|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL)\s+").unwrap();

    for (i, line) in content.lines().enumerate() {
        // Skip empty lines and comments
        if line.trim().is_empty() || line.trim_start().starts_with('#') {
            continue;
        }

        // Check if this line starts a new instruction
        if let Some(captures) = re.captures(line) {
            // If we were tracking a previous block, add it to our list
            if !current_instruction.is_empty() {
                blocks.push((current_block_start, i - 1, current_instruction.clone()));
            }

            // Start a new block
            current_block_start = i;
            if let Some(instruction) = captures.get(1) {
                current_instruction = instruction.as_str().to_string();
            }
        }
    }

    // Add the last block if there is one
    if !current_instruction.is_empty() {
        blocks.push((
            current_block_start,
            content.lines().count() - 1,
            current_instruction.clone(),
        ));
    }

    blocks
}

/// Function to render Dockerfile with syntax highlighting and tooltips
pub fn render_dockerfile_with_highlighting(content: &str) -> Result<impl IntoElement> {
    // Get the map of Dockerfile commands
    let commands = get_dockerfile_commands();

    // Parse the Dockerfile content into blocks
    let blocks = parse_dockerfile_blocks(content);

    // Regular expression to match Dockerfile instructions
    let re = Regex::new(r"^\s*(FROM|RUN|CMD|LABEL|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL)\s+").unwrap();

    // Create elements for each line
    let line_elements = content
        .lines()
        .enumerate()
        .map(|(i, line)| {
            // Determine if this line is the start of an instruction
            let mut instruction = String::new();
            if let Some(captures) = re.captures(line) {
                if let Some(instr) = captures.get(1) {
                    instruction = instr.as_str().to_string();
                }
            }

            // Determine the background color based on block
            let bg_color = blocks
                .iter()
                .find(|(start, end, _)| i >= *start && i <= *end)
                .map(|_| rgb(0x1a202c)) // Slightly lighter background for blocks
                .unwrap_or(rgb(0x2d3748)); // Default background

            // Create element for this line
            let line_element =
                div()
                    .flex()
                    .py_1()
                    .px_2()
                    .bg(bg_color)
                    .child(div().flex_grow().child(if instruction.is_empty() {
                        // Regular line
                        div().child(line.to_string())
                    } else if let Some(cmd_info) = commands.get(&instruction) {
                        // Line with Dockerfile instruction - add tooltip
                        div()
                            .relative()
                            .group("tooltip")
                            .child(
                                div().child(line.to_string()).text_color(rgb(0x3b82f6)), // Highlight instruction
                            )
                            .child(
                                div()
                                    .absolute()
                                    .left_0()
                                    .top_full()
                                    .mt_2()
                                    .w_96()
                                    .p_4()
                                    .bg(rgb(0x1e293b))
                                    .border_1()
                                    .border_color(rgb(0x3b82f6))
                                    .rounded_md()
                                    .shadow_lg()
                                    .visibility_hidden() // Use visibility_hidden instead of display_none
                                    .group_hover(|s| s.visibility_visible()) // Use visibility_visible instead of display
                                    .child(
                                        div()
                                            .flex()
                                            .flex_col()
                                            .gap_2()
                                            .child(
                                                div()
                                                    .text_lg()
                                                    .text_color(rgb(0x3b82f6))
                                                    .child(instruction.clone()),
                                            )
                                            .child(div().child(cmd_info.description.clone()))
                                            .child(
                                                div()
                                                    .mt_2()
                                                    .text_color(rgb(0xf59e0b))
                                                    .child("Side Effect:"),
                                            )
                                            .child(div().child(cmd_info.side_effect.clone()))
                                            .child(
                                                div()
                                                    .mt_2()
                                                    .text_color(rgb(0x10b981))
                                                    .child("Example:"),
                                            )
                                            .child(
                                                div()
                                                    .p_2()
                                                    .bg(rgb(0x374151))
                                                    .rounded_md()
                                                    .child(cmd_info.example.clone()),
                                            ),
                                    ),
                            )
                    } else {
                        // Instruction without tooltip info
                        div().child(line.to_string())
                    }));

            line_element
        })
        .collect::<Vec<_>>();

    // Create a container for all lines
    let editor = div()
        .flex()
        .flex_col()
        .w_full()
        .h_full()
        .overflow_y_visible() // Use overflow_y_visible instead of overflow_y_auto
        .bg(rgb(0x2d3748))
        .text_color(rgb(0xe2e8f0))
        .children(line_elements);

    Ok(editor)
}
