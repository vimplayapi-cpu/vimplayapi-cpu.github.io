import { makeItemRoutes } from '@/lib/admin/resource';
import { timelineConfig } from '../config';

export const dynamic = 'force-dynamic';
const routes = makeItemRoutes(timelineConfig);
export const GET = routes.GET;
export const PUT = routes.PUT;
export const DELETE = routes.DELETE;
