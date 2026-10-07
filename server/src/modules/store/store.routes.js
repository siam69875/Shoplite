import { Router } from 'express';
import { getStoreInfo } from './store.service.js';

export const storeRouter = Router();

// Public: no login needed, the header and footer show it to guests.
storeRouter.get('/', (req, res) => res.json(getStoreInfo()));
