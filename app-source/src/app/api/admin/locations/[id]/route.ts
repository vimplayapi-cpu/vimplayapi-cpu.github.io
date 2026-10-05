import { makeItemRoutes } from '@/lib/admin/resource';
import { locationsConfig } from '../config';

export const dynamic = 'force-dynamic';
const routes = makeItemRoutes(locationsConfig);
export const GET = routes.GET;
export const PUT = routes.PUT;
export const DELETE = routes.DELETE;
