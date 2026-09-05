import { ProductService } from '../services/product.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class ProductController {
  static async getProducts(req, res, next) {
    try {
      const {
        search,
        category,
        minPrice,
        maxPrice,
        inStockOnly,
        includeExpired,
        sortBy,
        page,
        limit,
      } = req.query;

      const result = await ProductService.getProducts({
        search,
        category,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        inStockOnly: inStockOnly === 'true',
        includeExpired: includeExpired === 'true',
        sortBy,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 12,
      });

      return sendSuccess(res, result.products, 'Products retrieved successfully', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getProductBySlug(req, res, next) {
    try {
      const product = await ProductService.getProductBySlug(req.params.slug);
      return sendSuccess(res, product, 'Product fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getProductById(req, res, next) {
    try {
      const product = await ProductService.getProductById(req.params.id);
      return sendSuccess(res, product, 'Product fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createProduct(req, res, next) {
    try {
      const product = await ProductService.createProduct(req.body);
      return sendSuccess(res, product, 'Product created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

    static async updateProduct(req, res, next) {
    try {
      const product = await ProductService.updateProduct(req.params.id, req.body);
      return sendSuccess(res, product, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateStock(req, res, next) {
    try {
      const { variantId } = req.params;
      const { stockQuantity } = req.body;
      const updated = await ProductService.updateProductVariantStock(variantId, stockQuantity);
      return sendSuccess(res, updated, 'Stock updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCategories(req, res, next) {
    try {
      const categories = await ProductService.getCategories();
      return sendSuccess(res, categories, 'Categories fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}
