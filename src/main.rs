mod docker;
mod dockerfile;
mod dockerfile_editor;
mod ui;

use gpui::{div, prelude::*, rgb, App, Context, FontWeight, Window};
use ui::{ActiveTab, LayersApp};

// Import theme constants from ui module
use ui::{
    THEME_BG_ACCENT, THEME_BG_ACCENT_HOVER, THEME_BG_DESTRUCTIVE, THEME_BG_MUTED, THEME_BG_PRIMARY,
    THEME_BG_SECONDARY, THEME_BORDER, THEME_TEXT_MUTED, THEME_TEXT_PRIMARY, THEME_TEXT_SECONDARY,
};

struct AppState {
    app: LayersApp,
}

impl AppState {
    fn new() -> Self {
        Self {
            app: LayersApp::new(),
        }
    }

    fn inspect_image(&mut self, image_name: &str) {
        let image_name = image_name.to_string();
        self.app.set_loading(true);
        self.app.set_image_name(image_name.clone());

        match docker::inspect_image(&image_name) {
            Ok(image) => {
                self.app.set_image(image);
            }
            Err(err) => {
                self.app.set_error(format!("Error: {}", err));
            }
        }
    }

    fn analyze_dockerfile(&mut self, content: &str) {
        let temp_path = std::env::temp_dir().join("temp_dockerfile");
        std::fs::write(&temp_path, content).unwrap_or_else(|_| {
            self.app
                .set_error("Failed to write temporary Dockerfile".to_string());
        });

        match dockerfile::Dockerfile::parse(&temp_path) {
            Ok(dockerfile) => {
                self.app.set_dockerfile(dockerfile);

                // Now we can use the analyze method directly
                let analysis = self.app.dockerfile.as_ref().unwrap().analyze();
                self.app.set_dockerfile_analysis(analysis);
            }
            Err(err) => {
                self.app
                    .set_error(format!("Failed to parse Dockerfile: {}", err));
            }
        }

        // Clean up
        let _ = std::fs::remove_file(temp_path);
    }

    fn switch_tab(&mut self, tab: ActiveTab) {
        self.app.switch_tab(tab);
    }
}

impl Render for AppState {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .size_full()
            .bg(rgb(THEME_BG_PRIMARY))
            .text_color(rgb(THEME_TEXT_PRIMARY))
            .p_4()
            .gap_4()
            .child(self.render_header())
            .child(self.render_tabs())
            .child(
                div()
                    .flex()
                    .flex_grow()
                    .gap_4()
                    .child(self.render_content()),
            )
    }
}

impl AppState {
    fn render_header(&self) -> impl IntoElement {
        div()
            .flex()
            .items_center()
            .justify_between()
            .w_full()
            .h_16()
            .px_4()
            .py_2()
            .bg(rgb(THEME_BG_SECONDARY))
            .border_1()
            .border_color(rgb(THEME_BORDER))
            .child(div().text_xl().child("Docker Layers Inspector"))
            .child(
                div()
                    .flex()
                    .items_center()
                    .gap_2()
                    .child(match self.app.active_tab {
                        ActiveTab::ImageInspector => div()
                            .flex_grow()
                            .min_w_64()
                            .px_3()
                            .py_2()
                            .bg(rgb(THEME_BG_MUTED))
                            .border_1()
                            .border_color(rgb(THEME_BORDER))
                            .text_color(rgb(THEME_TEXT_SECONDARY))
                            .child(if self.app.image_name.is_empty() {
                                "Enter image name...".into()
                            } else {
                                self.app.image_name.to_string()
                            }),
                        ActiveTab::DockerfileAnalyzer => div()
                            .flex_grow()
                            .min_w_64()
                            .px_3()
                            .py_2()
                            .bg(rgb(THEME_BG_MUTED))
                            .border_1()
                            .border_color(rgb(THEME_BORDER))
                            .text_color(rgb(THEME_TEXT_SECONDARY))
                            .child("Enter Dockerfile content..."),
                    })
                    .child(
                        div()
                            .px_4()
                            .py_2()
                            .bg(rgb(THEME_BG_ACCENT))
                            .hover(|s| s.bg(rgb(THEME_BG_ACCENT_HOVER)))
                            .cursor_pointer()
                            .child(match self.app.active_tab {
                                ActiveTab::ImageInspector => "Inspect",
                                ActiveTab::DockerfileAnalyzer => "Analyze",
                            }),
                    ),
            )
    }

    fn render_tabs(&self) -> impl IntoElement {
        div()
            .flex()
            .w_full()
            .bg(rgb(THEME_BG_SECONDARY))
            .border_1()
            .border_color(rgb(THEME_BORDER))
            .child(
                div()
                    .px_4()
                    .py_2()
                    .bg(if self.app.active_tab == ActiveTab::ImageInspector {
                        rgb(THEME_BG_ACCENT)
                    } else {
                        rgb(THEME_BG_SECONDARY)
                    })
                    .hover(|s| {
                        s.bg(if self.app.active_tab == ActiveTab::ImageInspector {
                            rgb(THEME_BG_ACCENT)
                        } else {
                            rgb(THEME_BG_ACCENT_HOVER)
                        })
                    })
                    .cursor_pointer()
                    .child("Image Inspector"),
            )
            .child(
                div()
                    .px_4()
                    .py_2()
                    .bg(if self.app.active_tab == ActiveTab::DockerfileAnalyzer {
                        rgb(THEME_BG_ACCENT)
                    } else {
                        rgb(THEME_BG_SECONDARY)
                    })
                    .hover(|s| {
                        s.bg(if self.app.active_tab == ActiveTab::DockerfileAnalyzer {
                            rgb(THEME_BG_ACCENT)
                        } else {
                            rgb(THEME_BG_ACCENT_HOVER)
                        })
                    })
                    .cursor_pointer()
                    .child("Dockerfile Analyzer"),
            )
    }

    fn render_content(&self) -> impl IntoElement {
        match self.app.active_tab {
            ActiveTab::ImageInspector => div()
                .flex()
                .flex_grow()
                .h_full()
                .children(vec![self.render_sidebar(), self.render_main_content()]),
            ActiveTab::DockerfileAnalyzer => div().flex().flex_grow().h_full().children(vec![
                self.render_dockerfile_editor(),
                self.render_dockerfile_analysis(),
            ]),
        }
    }

    fn render_dockerfile_editor(&self) -> impl IntoElement {
        // Get the content to display
        let content = if self.app.dockerfile_content.is_empty() {
            String::from("# Enter your Dockerfile here\nFROM ubuntu:latest\n\nRUN apt-get update && apt-get install -y curl\n\nCOPY . /app\n\nCMD [\"echo\", \"Hello World\"]")
        } else {
            self.app.dockerfile_content.to_string()
        };

        // Create the editor with syntax highlighting and tooltips
        let editor_result = dockerfile_editor::render_dockerfile_with_highlighting(&content);

        // Container for the editor
        div()
            .flex()
            .flex_col()
            .w_96() // Increased width for better readability
            .h_full()
            .bg(rgb(THEME_BG_SECONDARY))
            .border_1()
            .border_color(rgb(THEME_BORDER))
            .child(
                div()
                    .flex()
                    .items_center()
                    .justify_between()
                    .p_3()
                    .bg(rgb(THEME_BG_MUTED))
                    .border_b_1()
                    .border_color(rgb(THEME_BORDER))
                    .child(div().child("Dockerfile Editor"))
                    .child(
                        div()
                            .text_sm()
                            .text_color(rgb(THEME_TEXT_MUTED))
                            .child("Hover over commands for info"),
                    ),
            )
            .child(
                div()
                    .flex()
                    .flex_col()
                    .flex_grow()
                    .overflow_hidden() // Prevent overflow
                    .child(if let Ok(editor) = editor_result {
                        editor.into()
                    } else {
                        // Fallback to simple editor if highlighting fails
                        div()
                            .flex_grow()
                            .p_3()
                            .bg(rgb(THEME_BG_MUTED))
                            .border_1()
                            .border_color(rgb(THEME_BORDER))
                            .text_color(rgb(THEME_TEXT_PRIMARY))
                            .child(content)
                            .into()
                    }),
            )
            .into()
    }

    fn render_analysis_results(&self) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .flex_grow()
            .h_full()
            .bg(rgb(THEME_BG_SECONDARY))
            .border_1()
            .border_color(rgb(THEME_BORDER))
            .child(
                div()
                    .p_3()
                    .bg(rgb(THEME_BG_MUTED))
                    .border_b_1()
                    .border_color(rgb(THEME_BORDER))
                    .child("Analysis Results"),
            )
            .child(
                div()
                    .flex()
                    .flex_col()
                    .p_4()
                    .gap_4()
                    .overflow_y_auto()
                    .children(
                        self.app
                            .dockerfile_analysis
                            .iter()
                            .map(|(title, desc)| {
                                div()
                                    .flex()
                                    .flex_col()
                                    .p_3()
                                    .gap_2()
                                    .bg(rgb(THEME_BG_MUTED))
                                    .border_1()
                                    .border_color(rgb(THEME_BORDER))
                                    .child(div().font_weight(FontWeight::BOLD).child(title.clone()))
                                    .child(
                                        div()
                                            .text_color(rgb(THEME_TEXT_SECONDARY))
                                            .child(desc.clone()),
                                    )
                            })
                            .collect::<Vec<_>>(),
                    ),
            )
            .into()
    }

    fn render_dockerfile_analysis(&self) -> impl IntoElement {
        if self.app.loading {
            div()
                .flex()
                .flex_col()
                .flex_grow()
                .h_full()
                .items_center()
                .justify_center()
                .bg(rgb(THEME_BG_SECONDARY))
                .border_1()
                .border_color(rgb(THEME_BORDER))
                .child("Loading...")
                .into()
        } else if let Some(error) = &self.app.error_message {
            div()
                .flex()
                .flex_col()
                .flex_grow()
                .h_full()
                .p_4()
                .bg(rgb(THEME_BG_SECONDARY))
                .border_1()
                .border_color(rgb(THEME_BORDER))
                .child(
                    div()
                        .p_3()
                        .text_color(rgb(THEME_BG_DESTRUCTIVE))
                        .bg(rgb(THEME_BG_MUTED))
                        .border_1()
                        .border_color(rgb(THEME_BG_DESTRUCTIVE))
                        .child(error.to_string()),
                )
                .into()
        } else if self.app.dockerfile.is_some() {
            self.render_analysis_results()
        } else {
            div()
                .flex()
                .flex_col()
                .flex_grow()
                .h_full()
                .items_center()
                .justify_center()
                .bg(rgb(THEME_BG_SECONDARY))
                .border_1()
                .border_color(rgb(THEME_BORDER))
                .child("Enter a Dockerfile and click Analyze")
                .into()
        }
    }

    fn render_sidebar(&self) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .w_72()
            .h_full()
            .bg(rgb(THEME_BG_SECONDARY))
            .border_1()
            .border_color(rgb(THEME_BORDER))
            .child(
                div()
                    .p_3()
                    .bg(rgb(THEME_BG_MUTED))
                    .border_b_1()
                    .border_color(rgb(THEME_BORDER))
                    .child("Layers"),
            )
            .child(
                div()
                    .flex()
                    .flex_col()
                    .flex_grow()
                    .p_2()
                    .gap_2()
                    .children(self.render_layers()),
            )
            .into()
    }

    fn render_layers(&self) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .gap_2()
            .children(if self.app.loading {
                vec![div()
                    .p_3()
                    .bg(rgb(THEME_BG_MUTED))
                    .border_1()
                    .border_color(rgb(THEME_BORDER))
                    .child("Loading...")]
            } else if let Some(error) = &self.app.error_message {
                vec![div()
                    .p_3()
                    .text_color(rgb(THEME_BG_DESTRUCTIVE))
                    .bg(rgb(THEME_BG_MUTED))
                    .border_1()
                    .border_color(rgb(THEME_BG_DESTRUCTIVE))
                    .child(error.to_string())]
            } else if let Some(image) = &self.app.image {
                image
                    .layers
                    .iter()
                    .enumerate()
                    .map(|(i, layer)| {
                        let is_selected = self.app.selected_layer == Some(i);

                        div()
                            .p_3()
                            .bg(if is_selected {
                                rgb(THEME_BG_ACCENT)
                            } else {
                                rgb(THEME_BG_MUTED)
                            })
                            .hover(|s| {
                                if !is_selected {
                                    s.bg(rgb(THEME_BG_ACCENT_HOVER))
                                } else {
                                    s
                                }
                            })
                            .border_1()
                            .border_color(rgb(THEME_BORDER))
                            .cursor_pointer()
                            .child(
                                div()
                                    .flex()
                                    .flex_col()
                                    .gap_1()
                                    .child(
                                        div()
                                            .font_weight(FontWeight::BOLD)
                                            .child(format!("Layer {}", i + 1)),
                                    )
                                    .child(
                                        div()
                                            .text_sm()
                                            .text_color(rgb(THEME_TEXT_SECONDARY))
                                            .child(format!(
                                                "Size: {:.2} MB",
                                                layer.size as f64 / 1_000_000.0
                                            )),
                                    ),
                            )
                    })
                    .collect()
            } else {
                vec![div()
                    .p_3()
                    .bg(rgb(THEME_BG_MUTED))
                    .border_1()
                    .border_color(rgb(THEME_BORDER))
                    .child("No image loaded")]
            })
    }

    fn render_main_content(&self) -> impl IntoElement {
        if self.app.loading {
            div()
                .flex()
                .flex_col()
                .flex_grow()
                .h_full()
                .items_center()
                .justify_center()
                .bg(rgb(THEME_BG_SECONDARY))
                .border_1()
                .border_color(rgb(THEME_BORDER))
                .child("Loading...")
                .into()
        } else if let Some(error) = &self.app.error_message {
            div()
                .flex()
                .flex_col()
                .flex_grow()
                .h_full()
                .p_4()
                .bg(rgb(THEME_BG_SECONDARY))
                .border_1()
                .border_color(rgb(THEME_BORDER))
                .child(
                    div()
                        .p_3()
                        .text_color(rgb(THEME_BG_DESTRUCTIVE))
                        .bg(rgb(THEME_BG_MUTED))
                        .border_1()
                        .border_color(rgb(THEME_BG_DESTRUCTIVE))
                        .child(error.to_string()),
                )
                .into()
        } else if self.app.image.is_some() && self.app.selected_layer.is_some() {
            self.render_layer_details()
        } else {
            div()
                .flex()
                .flex_col()
                .flex_grow()
                .h_full()
                .items_center()
                .justify_center()
                .bg(rgb(THEME_BG_SECONDARY))
                .border_1()
                .border_color(rgb(THEME_BORDER))
                .child("Select a layer to view details")
                .into()
        }
    }

    fn render_layer_details(&self) -> impl IntoElement {
        let image = self.app.image.as_ref().unwrap();
        let layer_index = self.app.selected_layer.unwrap();
        let layer = &image.layers[layer_index];

        div()
            .flex()
            .flex_col()
            .flex_grow()
            .h_full()
            .bg(rgb(THEME_BG_SECONDARY))
            .border_1()
            .border_color(rgb(THEME_BORDER))
            .child(
                div()
                    .p_3()
                    .bg(rgb(THEME_BG_MUTED))
                    .border_b_1()
                    .border_color(rgb(THEME_BORDER))
                    .child(format!("Layer {} Details", layer_index + 1)),
            )
            .child(
                div()
                    .flex()
                    .flex_col()
                    .p_4()
                    .gap_4()
                    .overflow_y_auto()
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .gap_2()
                            .p_3()
                            .bg(rgb(THEME_BG_MUTED))
                            .border_1()
                            .border_color(rgb(THEME_BORDER))
                            .child(
                                div()
                                    .font_weight(FontWeight::BOLD)
                                    .child("Layer Information"),
                            )
                            .child(
                                div().flex().justify_between().child("ID:").child(
                                    div()
                                        .text_color(rgb(THEME_TEXT_SECONDARY))
                                        .child(layer.id.clone()),
                                ),
                            )
                            .child(
                                div().flex().justify_between().child("Size:").child(
                                    div().text_color(rgb(THEME_TEXT_SECONDARY)).child(format!(
                                        "{:.2} MB",
                                        layer.size as f64 / 1_000_000.0
                                    )),
                                ),
                            )
                            .child(
                                div().flex().justify_between().child("Created:").child(
                                    div()
                                        .text_color(rgb(THEME_TEXT_SECONDARY))
                                        .child(layer.created.clone()),
                                ),
                            ),
                    )
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .gap_2()
                            .p_3()
                            .bg(rgb(THEME_BG_MUTED))
                            .border_1()
                            .border_color(rgb(THEME_BORDER))
                            .child(div().font_weight(FontWeight::BOLD).child("Command"))
                            .child(
                                div()
                                    .p_2()
                                    .bg(rgb(0x1e293b)) // Darker background for command
                                    .border_1()
                                    .border_color(rgb(THEME_BORDER))
                                    .text_color(rgb(THEME_TEXT_SECONDARY))
                                    .child(
                                        layer.command.clone().unwrap_or_else(|| "N/A".to_string()),
                                    ),
                            ),
                    )
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .gap_2()
                            .p_3()
                            .bg(rgb(THEME_BG_MUTED))
                            .border_1()
                            .border_color(rgb(THEME_BORDER))
                            .child(div().font_weight(FontWeight::BOLD).child("Files Changed"))
                            .child(if let Some(files) = &layer.files {
                                div()
                                    .flex()
                                    .flex_col()
                                    .gap_1()
                                    .max_h_64()
                                    .overflow_y_auto()
                                    .children(
                                        files
                                            .iter()
                                            .map(|file| {
                                                div()
                                                    .p_1()
                                                    .text_sm()
                                                    .text_color(rgb(THEME_TEXT_SECONDARY))
                                                    .child(file.clone())
                                            })
                                            .collect::<Vec<_>>(),
                                    )
                            } else {
                                div()
                                    .text_color(rgb(THEME_TEXT_MUTED))
                                    .child("No file information available")
                            }),
                    ),
            )
            .into()
    }
}

fn main() {
    gpui::App::new().run(|cx| {
        let app_state = cx.new_model(|_cx| AppState::new());

        cx.open_window(
            WindowOptions {
                window_bounds: Some(gpui::WindowBounds::Windowed(gpui::Bounds {
                    origin: Default::default(),
                    size: gpui::Size {
                        width: px(1200.0),
                        height: px(800.0),
                    },
                })),
                ..Default::default()
            },
            |cx| cx.new_view(|_cx| app_state.clone()),
        );
    });
}
