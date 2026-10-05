import { makeItemRoutes } from '@/lib/admin/resource';
import { galleryConfig } from '../config';

export const dynamic = 'force-dynamic';
const routes = makeItemRoutes(galleryConfig);
export const GET = routes.GET;
export const PUT = routes.PUT;
export const DELETE = routes.DELETE;
