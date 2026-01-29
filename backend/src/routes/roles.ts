import { Router } from 'express';
import { authenticate } from '../lib/auth';

const router = Router();
router.use(authenticate);

// Placeholder routes
router.get('/', (req, res) => res.json([]));
router.get('/:id', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
router.post('/', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
router.put('/:id', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
router.delete('/:id', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));

export default router;
