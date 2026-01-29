import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Use asServiceRole to bypass RLS and fetch all users with on_team_schedule = true
        const users = await base44.asServiceRole.entities.User.filter({
            on_team_schedule: true
        });

        return Response.json(users);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});