import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  createServiceInputSchema,
  createApplicationInputSchema,
  updateApplicationInputSchema,
  uploadDocumentInputSchema,
  getApplicationsQuerySchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { getUserById } from './handlers/get_user_by_id';
import { createService } from './handlers/create_service';
import { getServices } from './handlers/get_services';
import { getServiceById } from './handlers/get_service_by_id';
import { createApplication } from './handlers/create_application';
import { updateApplication } from './handlers/update_application';
import { getApplications } from './handlers/get_applications';
import { getApplicationById } from './handlers/get_application_by_id';
import { submitApplication } from './handlers/submit_application';
import { uploadDocument } from './handlers/upload_document';
import { getApplicationDocuments } from './handlers/get_application_documents';
import { deleteDocument } from './handlers/delete_document';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User procedures
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  getUserById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getUserById(input.id)),

  // Service procedures
  createService: publicProcedure
    .input(createServiceInputSchema)
    .mutation(({ input }) => createService(input)),
  
  getServices: publicProcedure
    .query(() => getServices()),
  
  getServiceById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getServiceById(input.id)),

  // Application procedures
  createApplication: publicProcedure
    .input(createApplicationInputSchema)
    .mutation(({ input }) => createApplication(input)),
  
  updateApplication: publicProcedure
    .input(updateApplicationInputSchema)
    .mutation(({ input }) => updateApplication(input)),
  
  getApplications: publicProcedure
    .input(getApplicationsQuerySchema)
    .query(({ input }) => getApplications(input)),
  
  getApplicationById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getApplicationById(input.id)),
  
  submitApplication: publicProcedure
    .input(z.object({ applicationId: z.number() }))
    .mutation(({ input }) => submitApplication(input.applicationId)),

  // Document procedures
  uploadDocument: publicProcedure
    .input(uploadDocumentInputSchema)
    .mutation(({ input }) => uploadDocument(input)),
  
  getApplicationDocuments: publicProcedure
    .input(z.object({ applicationId: z.number() }))
    .query(({ input }) => getApplicationDocuments(input.applicationId)),
  
  deleteDocument: publicProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(({ input }) => deleteDocument(input.documentId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();