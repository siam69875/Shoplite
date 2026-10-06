import { Router } from 'express';
import { parseId } from '../../core/validate.js';
import { getProduct, listCategories, listProducts } from './catalog.service.js';

export const catalogRouter = Router();

catalogRouter.get('/', (req, res) => {
  const { search, category, sort, minPrice, maxPrice, inStock, onSale, limit } = req.query;
  res.json({ products: listProducts({ search, category, sort, minPrice, maxPrice, inStock, onSale, limit }) });
});

catalogRouter.get('/categories', (req, res) => {
  res.json({ categories: listCategories() });
});

catalogRouter.get('/:id', (req, res) => {
  res.json({ product: getProduct(parseId(req.params.id, 'product id')) });
});
