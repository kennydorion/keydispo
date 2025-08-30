use wasm_bindgen::prelude::*;
use js_sys::Array;

#[wasm_bindgen]
pub struct HighlightEngine {
    grid_width: f64,
    grid_height: f64,
    col_width: f64,
    row_height: f64,
    cols_count: usize,
    rows_count: usize,
    scroll_left: f64,
    scroll_top: f64,
}

#[wasm_bindgen]
pub struct HighlightResult {
    pub col_index: i32,
    pub row_index: i32,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub valid: bool,
}

#[wasm_bindgen]
impl HighlightEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> HighlightEngine {
        HighlightEngine {
            grid_width: 0.0,
            grid_height: 0.0,
            col_width: 120.0,
            row_height: 40.0,
            cols_count: 0,
            rows_count: 0,
            scroll_left: 0.0,
            scroll_top: 0.0,
        }
    }

    #[wasm_bindgen]
    pub fn configure(&mut self, 
        grid_width: f64, 
        grid_height: f64,
        col_width: f64,
        row_height: f64,
        cols_count: usize,
        rows_count: usize
    ) {
        self.grid_width = grid_width;
        self.grid_height = grid_height;
        self.col_width = col_width;
        self.row_height = row_height;
        self.cols_count = cols_count;
        self.rows_count = rows_count;
    }

    #[wasm_bindgen]
    pub fn update_scroll(&mut self, scroll_left: f64, scroll_top: f64) {
        self.scroll_left = scroll_left;
        self.scroll_top = scroll_top;
    }

    #[wasm_bindgen]
    pub fn calculate_highlight(&self, mouse_x: f64, mouse_y: f64) -> HighlightResult {
        // Calcul ultra-rapide de la position
        let adjusted_x = mouse_x + self.scroll_left;
        let adjusted_y = mouse_y + self.scroll_top;
        
        // Détection de colonne (compensé par le scroll)
        let col_index = if adjusted_x >= 0.0 {
            (adjusted_x / self.col_width).floor() as i32
        } else {
            -1
        };
        
        // Détection de ligne (compensé par le scroll)
        let row_index = if adjusted_y >= 0.0 {
            (adjusted_y / self.row_height).floor() as i32
        } else {
            -1
        };
        
        // Validation des bounds
        let valid = col_index >= 0 && 
                   row_index >= 0 && 
                   (col_index as usize) < self.cols_count && 
                   (row_index as usize) < self.rows_count;
        
        // Calcul des positions de highlight
        let x = if valid { col_index as f64 * self.col_width - self.scroll_left } else { 0.0 };
        let y = if valid { row_index as f64 * self.row_height - self.scroll_top } else { 0.0 };
        
        HighlightResult {
            col_index,
            row_index,
            x,
            y,
            width: self.col_width,
            height: self.row_height,
            valid,
        }
    }

    #[wasm_bindgen]
    pub fn batch_calculate_highlights(&self, mouse_positions: &Array) -> Array {
        let results = Array::new();
        
        for i in 0..mouse_positions.length() {
            let pos = mouse_positions.get(i);
            // Extraction des coordonnées depuis l'objet JS
            let mouse_x = js_sys::Reflect::get(&pos, &"x".into()).unwrap().as_f64().unwrap_or(0.0);
            let mouse_y = js_sys::Reflect::get(&pos, &"y".into()).unwrap().as_f64().unwrap_or(0.0);
            
            let result = self.calculate_highlight(mouse_x, mouse_y);
            results.push(&JsValue::from(result));
        }
        
        results
    }

    #[wasm_bindgen]
    pub fn calculate_column_highlights(&self, col_index: i32) -> Array {
        let results = Array::new();
        
        if col_index >= 0 && (col_index as usize) < self.cols_count {
            let x = col_index as f64 * self.col_width - self.scroll_left;
            
            for row in 0..self.rows_count {
                let y = row as f64 * self.row_height - self.scroll_top;
                
                let result = HighlightResult {
                    col_index,
                    row_index: row as i32,
                    x,
                    y,
                    width: self.col_width,
                    height: self.row_height,
                    valid: true,
                };
                
                results.push(&JsValue::from(result));
            }
        }
        
        results
    }

    #[wasm_bindgen]
    pub fn calculate_row_highlights(&self, row_index: i32) -> Array {
        let results = Array::new();
        
        if row_index >= 0 && (row_index as usize) < self.rows_count {
            let y = row_index as f64 * self.row_height - self.scroll_top;
            
            for col in 0..self.cols_count {
                let x = col as f64 * self.col_width - self.scroll_left;
                
                let result = HighlightResult {
                    col_index: col as i32,
                    row_index,
                    x,
                    y,
                    width: self.col_width,
                    height: self.row_height,
                    valid: true,
                };
                
                results.push(&JsValue::from(result));
            }
        }
        
        results
    }

    #[wasm_bindgen]
    pub fn get_performance_stats(&self) -> js_sys::Object {
        let stats = js_sys::Object::new();
        
        js_sys::Reflect::set(&stats, &"grid_cells".into(), &JsValue::from(self.cols_count * self.rows_count)).unwrap();
        js_sys::Reflect::set(&stats, &"cols_count".into(), &JsValue::from(self.cols_count)).unwrap();
        js_sys::Reflect::set(&stats, &"rows_count".into(), &JsValue::from(self.rows_count)).unwrap();
        js_sys::Reflect::set(&stats, &"col_width".into(), &JsValue::from(self.col_width)).unwrap();
        js_sys::Reflect::set(&stats, &"row_height".into(), &JsValue::from(self.row_height)).unwrap();
        
        stats
    }
}

#[wasm_bindgen]
impl HighlightResult {
    #[wasm_bindgen(getter)]
    pub fn col_index(&self) -> i32 { self.col_index }
    
    #[wasm_bindgen(getter)]
    pub fn row_index(&self) -> i32 { self.row_index }
    
    #[wasm_bindgen(getter)]
    pub fn x(&self) -> f64 { self.x }
    
    #[wasm_bindgen(getter)]
    pub fn y(&self) -> f64 { self.y }
    
    #[wasm_bindgen(getter)]
    pub fn width(&self) -> f64 { self.width }
    
    #[wasm_bindgen(getter)]
    pub fn height(&self) -> f64 { self.height }
    
    #[wasm_bindgen(getter)]
    pub fn valid(&self) -> bool { self.valid }
}

// Fonction utilitaire pour benchmarking
#[wasm_bindgen]
pub fn benchmark_calculations(iterations: usize) -> f64 {
    let mut engine = HighlightEngine::new();
    engine.configure(1200.0, 800.0, 120.0, 40.0, 10, 20);
    
    let start = web_sys::window()
        .unwrap()
        .performance()
        .unwrap()
        .now();
    
    for i in 0..iterations {
        let x = (i % 1200) as f64;
        let y = (i % 800) as f64;
        engine.calculate_highlight(x, y);
    }
    
    let end = web_sys::window()
        .unwrap()
        .performance()
        .unwrap()
        .now();
    
    (end - start) / iterations as f64
}
