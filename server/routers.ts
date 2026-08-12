import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getGoogleCalendarStatus, upsertGoogleCalendarEvent } from "./googleCalendar";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  calendar: router({
    status: publicProcedure.query(({ ctx }) => getGoogleCalendarStatus(ctx.req)),
    upsertGoogleEvent: publicProcedure
      .input(z.object({
        id: z.string().min(1),
        title: z.string().min(1).max(300),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")),
        duration: z.number().int().min(15).max(720),
        category: z.string().min(1).max(80),
        subject: z.string().max(120).optional(),
        reminder: z.enum(["default", "0", "10", "30", "60"]),
        notes: z.string().max(4000).optional(),
        eventId: z.string().optional(),
        timeZone: z.string().min(1).max(100),
      }))
      .mutation(({ ctx, input }) => upsertGoogleCalendarEvent(ctx.req, input)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
