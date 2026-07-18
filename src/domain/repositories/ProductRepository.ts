import { Product } from '../entities/Product';

export interface ProductRepository {
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  createProduct(product: Partial<Product>): Promise<Product>;
  updateProduct(id: string, product: Partial<Product>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  syncProducts(): Promise<void>;
}
