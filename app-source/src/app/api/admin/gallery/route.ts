import { makeCollectionRoutes } from '@/lib/admin/resource';
import { galleryConfig } from './config';

export const dynamic = 'force-dynamic';
const routes = makeCollectionRoutes(galleryConfig);
export const GET = routes.GET;
export const POST = routes.POST;
export const PATCH = routes.PATCH!;
