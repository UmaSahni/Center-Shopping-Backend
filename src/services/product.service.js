import { prisma } from '../config/db.js';
import { AppError } from '../utils/appError.js';

export class ProductService {
  /**
   * Search and filter products with pagination (Optimized for large datasets)
   */
  static async getProducts(filters = {}) {
    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = Math.min(Math.max(Number(filters.limit) || 12, 1), 2000);
    const skip = (page - 1) * limit;

    const where = {
      isPublished: true,
    };

    // Filter by product expiry (exclude expired products by default for customer storefront)
    if (!filters.includeExpired) {
      where.OR = [
        { expiryDate: null },
        { expiryDate: { gt: new Date() } },
      ];
    }

    // Category filter (supports array or comma-separated multi-select)
    if (filters.category && filters.category !== 'all') {
      let catList = [];
      if (Array.isArray(filters.category)) {
        catList = filters.category.filter((c) => c && c !== 'all');
      } else if (typeof filters.category === 'string') {
        catList = filters.category
          .split(',')
          .map((c) => c.trim())
          .filter((c) => c && c !== 'all');
      }

      if (catList.length === 1) {
        where.category = { equals: catList[0] };
      } else if (catList.length > 1) {
        where.category = { in: catList };
      }
    }

    // Search query (title or description)
    // Search query (title, description, category, variant SKU, variant title, and multi-word token matching)
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim();
      const words = searchTerm.split(/\s+/).filter(Boolean);

      const directPhraseCondition = {
        OR: [
          { title: { contains: searchTerm } },
          { description: { contains: searchTerm } },
          { category: { contains: searchTerm } },
          {
            variants: {
              some: {
                OR: [
                  { sku: { contains: searchTerm } },
                  { title: { contains: searchTerm } },
                ],
              },
            },
          },
        ],
      };

      let searchCondition = directPhraseCondition;
      if (words.length > 1) {
        const tokenConditions = words.map((w) => ({
          OR: [
            { title: { contains: w } },
            { description: { contains: w } },
            { category: { contains: w } },
            {
              variants: {
                some: {
                  OR: [
                    { sku: { contains: w } },
                    { title: { contains: w } },
                  ],
                },
              },
            },
          ],
        }));

        searchCondition = {
          OR: [directPhraseCondition, { AND: tokenConditions }],
        };
      }

      where.AND = [
        ...(where.AND || []),
        searchCondition,
      ];
    }

    // In-stock only filter
    if (filters.inStockOnly) {
      where.variants = {
        some: {
          stockQuantity: { gt: 0 },
        },
      };
    }

    // Price range filters
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const priceFilter = {};
      if (filters.minPrice !== undefined) priceFilter.gte = Number(filters.minPrice);
      if (filters.maxPrice !== undefined) priceFilter.lte = Number(filters.maxPrice);

      where.variants = {
        ...(where.variants || {}),
        some: {
          price: priceFilter,
          ...(filters.inStockOnly ? { stockQuantity: { gt: 0 } } : {}),
        },
      };
    }

    const isPriceAsc = filters.sortBy === 'price_asc' || filters.sortBy === 'price-low';
    const isPriceDesc = filters.sortBy === 'price_desc' || filters.sortBy === 'price-high';

    if (isPriceAsc || isPriceDesc) {
      // Query matching product IDs and variant prices to sort globally across all database records
      const matching = await prisma.product.findMany({
        where,
        select: {
          id: true,
          variants: {
            select: { price: true },
          },
        },
      });

      matching.sort((a, b) => {
        const priceA = a.variants?.length ? Math.min(...a.variants.map((v) => Number(v.price))) : 0;
        const priceB = b.variants?.length ? Math.min(...b.variants.map((v) => Number(v.price))) : 0;
        if (priceA === priceB) {
          return a.id.localeCompare(b.id);
        }
        return isPriceAsc ? priceA - priceB : priceB - priceA;
      });

      const totalCount = matching.length;
      const pageIds = matching.slice(skip, skip + limit).map((p) => p.id);

      if (pageIds.length === 0) {
        return {
          products: [],
          pagination: {
            page,
            limit,
            totalItems: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        };
      }

      const products = await prisma.product.findMany({
        where: { id: { in: pageIds } },
        include: {
          variants: {
            orderBy: { price: 'asc' },
          },
        },
      });

      // Preserve exact sorted order of pageIds
      const productMap = new Map(products.map((p) => [p.id, p]));
      const sortedProducts = pageIds.map((id) => productMap.get(id)).filter(Boolean);

      return {
        products: sortedProducts,
        pagination: {
          page,
          limit,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    }

    let orderBy = { createdAt: 'desc' };
    if (filters.sortBy === 'title') {
      orderBy = { title: 'asc' };
    }

    // Run queries in parallel for high throughput
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          variants: {
            orderBy: { price: 'asc' },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  static async getProductBySlug(slug) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        variants: true,
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const isExpired = product.expiryDate ? new Date(product.expiryDate) <= new Date() : false;

    return {
      ...product,
      isExpired,
    };
  }

  static async getProductById(id) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const isExpired = product.expiryDate ? new Date(product.expiryDate) <= new Date() : false;

    return {
      ...product,
      isExpired,
    };
  }

  static async createProduct(data) {
    const baseSlug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return prisma.product.create({
      data: {
        title: data.title,
        slug,
        description: data.description,
        category: data.category,
        imageUrl: data.imageUrl,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        isPublished: data.isPublished !== undefined ? data.isPublished : true,
        variants: {
          create: data.variants.map((v) => ({
            sku: v.sku.toUpperCase(),
            title: v.title,
            price: Number(v.price),
            stockQuantity: Number(v.stockQuantity),
            lowStockThreshold: Number(v.lowStockThreshold || 5),
          })),
        },
      },
      include: {
        variants: true,
      },
    });
  }

    static async updateProduct(id, data) {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!existing) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
    if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;

    // Update product record
    await prisma.product.update({
      where: { id },
      data: updateData,
    });

    // Update primary variant if top-level variant fields provided
    if (data.stockQuantity !== undefined || data.price !== undefined || data.sku !== undefined || data.lowStockThreshold !== undefined || data.variantTitle !== undefined) {
      const primaryVariant = existing.variants?.[0];
      if (primaryVariant) {
        await prisma.productVariant.update({
          where: { id: primaryVariant.id },
          data: {
            ...(data.variantTitle ? { title: data.variantTitle } : {}),
            ...(data.sku ? { sku: data.sku.toUpperCase() } : {}),
            ...(data.price !== undefined ? { price: Number(data.price) } : {}),
            ...(data.stockQuantity !== undefined ? { stockQuantity: Number(data.stockQuantity) } : {}),
            ...(data.lowStockThreshold !== undefined ? { lowStockThreshold: Number(data.lowStockThreshold) } : {}),
          },
        });
      }
    }

    // If variants were provided, update them
    if (data.variants && Array.isArray(data.variants)) {
      const existingVariantIds = new Set(existing.variants.map((v) => v.id));
      const incomingVariantIds = new Set(data.variants.filter((v) => v.id).map((v) => v.id));

      // Remove variants that were deleted in the UI (only if at least 1 variant remains)
      if (data.variants.length > 0) {
        for (const existingVar of existing.variants) {
          if (!incomingVariantIds.has(existingVar.id)) {
            try {
              await prisma.productVariant.delete({ where: { id: existingVar.id } });
            } catch (err) {
              console.warn(`Could not delete variant ${existingVar.id}:`, err.message);
            }
          }
        }
      }

      // Update existing or create newly added variants
      for (const v of data.variants) {
        if (v.id && existingVariantIds.has(v.id)) {
          await prisma.productVariant.update({
            where: { id: v.id },
            data: {
              ...(v.title !== undefined ? { title: v.title } : {}),
              ...(v.sku ? { sku: v.sku.toUpperCase() } : {}),
              ...(v.price !== undefined ? { price: Number(v.price) } : {}),
              ...(v.stockQuantity !== undefined ? { stockQuantity: Number(v.stockQuantity) } : {}),
              ...(v.lowStockThreshold !== undefined ? { lowStockThreshold: Number(v.lowStockThreshold) } : {}),
            },
          });
        } else {
          const generatedSku = v.sku?.trim()
            ? v.sku.toUpperCase()
            : `CS-SKU-${id.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`;
          await prisma.productVariant.create({
            data: {
              productId: id,
              title: v.title || 'Standard Variant',
              sku: generatedSku,
              price: Number(v.price || 0),
              stockQuantity: Number(v.stockQuantity || 0),
              lowStockThreshold: Number(v.lowStockThreshold || 5),
            },
          });
        }
      }
    }

    return prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });
  }

  static async updateProductVariantStock(variantId, newStock) {
    return prisma.productVariant.update({
      where: { id: variantId },
      data: { stockQuantity: Number(newStock) },
      include: { product: true },
    });
  }

  static async getCategories() {
    const categories = await prisma.product.findMany({
      where: { isPublished: true },
      select: { category: true },
      distinct: ['category'],
    });

    return categories.map((c) => c.category);
  }
}
