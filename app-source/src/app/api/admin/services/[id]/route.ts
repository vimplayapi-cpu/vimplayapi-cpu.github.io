import { makeItemRoutes } from '@/lib/admin/resource';
import { servicesConfig } from '../config';

export const dynamic = 'force-dynamic';
const routes = makeItemRoutes(servicesConfig);
export const GET = routes.GET;
export const PUT = routes.PUT;
export const DELETE = routes.DELETE;
