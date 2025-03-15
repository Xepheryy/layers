use crate::docker::DockerImage;
use crate::dockerfile::Dockerfile;
use crate::dockerfile_editor;

// Define some theme colors for consistency
pub const THEME_BG_PRIMARY: u32 = 0x18181b; // Zinc 950
pub const THEME_BG_SECONDARY: u32 = 0x27272a; // Zinc 800
pub const THEME_BG_ACCENT: u32 = 0x3b82f6; // Blue 500
pub const THEME_BG_ACCENT_HOVER: u32 = 0x2563eb; // Blue 600
pub const THEME_BG_MUTED: u32 = 0x3f3f46; // Zinc 700
pub const THEME_BG_DESTRUCTIVE: u32 = 0xef4444; // Red 500

pub const THEME_TEXT_PRIMARY: u32 = 0xfafafa; // Zinc 50
pub const THEME_TEXT_SECONDARY: u32 = 0xa1a1aa; // Zinc 400
pub const THEME_TEXT_MUTED: u32 = 0x71717a; // Zinc 500
pub const THEME_TEXT_ACCENT: u32 = 0x3b82f6; // Blue 500

pub const THEME_BORDER: u32 = 0x3f3f46; // Zinc 700
pub const THEME_BORDER_FOCUS: u32 = 0x3b82f6; // Blue 500

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ActiveTab {
    ImageInspector,
    DockerfileAnalyzer,
}

#[derive(Debug, Clone)]
pub struct LayersApp {
    pub active_tab: ActiveTab,
    pub image: Option<DockerImage>,
    pub image_name: String,
    pub selected_layer: Option<usize>,
    pub loading: bool,
    pub error_message: Option<String>,
    pub dockerfile: Option<Dockerfile>,
    pub dockerfile_content: String,
    pub dockerfile_analysis: Vec<(String, String)>,
}

impl LayersApp {
    pub fn new() -> Self {
        Self {
            active_tab: ActiveTab::ImageInspector,
            image: None,
            image_name: String::new(),
            selected_layer: None,
            loading: false,
            error_message: None,
            dockerfile: None,
            dockerfile_content: String::new(),
            dockerfile_analysis: Vec::new(),
        }
    }
    
    pub fn set_loading(&mut self, loading: bool) {
        self.loading = loading;
        if loading {
            self.error_message = None;
        }
    }
    
    pub fn set_image_name(&mut self, name: String) {
        self.image_name = name;
    }
    
    pub fn set_image(&mut self, image: DockerImage) {
        self.image = Some(image);
        self.loading = false;
        self.error_message = None;
    }
    
    pub fn set_error(&mut self, error: String) {
        self.error_message = Some(error);
        self.loading = false;
    }
    
    pub fn set_dockerfile(&mut self, dockerfile: Dockerfile) {
        self.dockerfile = Some(dockerfile);
        self.loading = false;
        self.error_message = None;
    }
    
    pub fn set_dockerfile_analysis(&mut self, analysis: Vec<(String, String)>) {
        self.dockerfile_analysis = analysis;
    }
    
    pub fn switch_tab(&mut self, tab: ActiveTab) {
        self.active_tab = tab;
    }
}
