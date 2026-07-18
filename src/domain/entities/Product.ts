export type EstadoProducto = 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';

export interface Ingredient {
  id?: string;
  nombre: string;
  descripcion?: string;
  precio?: number;
  imagen_url?: string;
  store_id?: string;
  unidad_medida?: string;
  stock?: number;
  costo_unitario?: number;
  estado?: EstadoProducto;
  venta?: string;
  cantidad?: number;
}

export interface Addition {
  id?: string;
  nombre: string;
  descripcion?: string;
  precio?: number;
  imagen_url?: string;
  store_id?: string;
  stock?: number;
  estado?: EstadoProducto;
  venta?: string;
  cantidad?: number;
}

export interface ProductCategory {
  id: string;
  nombre: string;
  imagen_url?: string;
  orden: number;
  estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
  store_id?: string;
}

export interface RecipeItem {
  id: string;
  cantidad_use: number; // Note: using 'cantidad_use' from your snippet
}

export interface Product {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
  descripcion?: string;
  imagen_url: string;
  stock: number;
  sku?: string;
  allowDecimals?: boolean;
  tiene_ingredientes?: boolean;
  tiene_adiciones?: boolean;
  
  // Backend returns arrays of IDs for relationships
  ingredientes_ids?: string[];
  adiciones_ids?: string[];

  // Optional enriched data for frontend display logic
  ingredientes?: Ingredient[];
  adiciones?: Addition[];

  // Status
  estado?: EstadoProducto;
  tasa_impuesto?: number;
  tribute_id?: number;
  unit_measure_id?: number;
  costo_unitario?: number;

  // Recipe Snapshots for Inventory Optimization
  ingredientes_receta?: RecipeItem[];
  adiciones_receta?: RecipeItem[];

  // Inventory logic
  es_inventariable?: boolean;

  // Unit of Measure
  unidad_medida?: string; // e.g. 'Unidad', 'Kg', 'Litro', 'Libra'

  // Print Logic
  print_zone?: string; // ID or key of the PrintZone

  // Combo logic
  es_combo?: boolean;
  componentes_combo?: { 
    id: string; 
    nombre?: string; 
    cantidad_uso: number; 
    precio_snapshot?: number 
  }[];
  
  // Backward compatibility/UI logic
  categoria_id?: string; 
}

// POS State helper
export type PosDataState = {
  products: Product[];
  categories: ProductCategory[];
  ingredients: Ingredient[];
  additions: Addition[];
  isLoading: boolean;
  error: string | null;
};
