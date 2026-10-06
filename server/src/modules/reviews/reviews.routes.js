import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { parseId } from '../../core/validate.js';
import { createReview, getEligibility, listReviews } from './reviews.service.js';

// Mounted at /api/products/:productId/reviews
export const reviewsRouter = Router({ mergeParams: true });

reviewsRouter.get('/', (req, res) => {
  res.json({ reviews: listReviews(parseId(req.params.productId, 'product id')) });
});

reviewsRouter.get('/eligibility', requireAuth, (req, res) => {
  res.json(getEligibility(req.user.id, parseId(req.params.productId, 'product id')));
});

reviewsRouter.post('/', requireAuth, (req, res) => {
  const reviews = createReview(req.user.id, parseId(req.params.productId, 'product id'), req.body ?? {});
  res.status(201).json({ reviews });
});
