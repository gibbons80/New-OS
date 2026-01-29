import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { event, data, old_data } = await req.json();

        // Only handle Feedback updates
        if (event.type !== 'update' || event.entity_name !== 'Feedback') {
            return Response.json({ success: true });
        }

        const feedbackId = event.entity_id;
        const oldStatus = old_data?.status;
        const newStatus = data?.status;

        // If status changed to 'Completed' and completed_at is not already set
        if (newStatus === 'Completed' && oldStatus !== 'Completed' && !data?.completed_at) {
            await base44.asServiceRole.entities.Feedback.update(feedbackId, {
                completed_at: new Date().toISOString()
            });
        } 
        // If status changed away from 'Completed', clear completed_at
        else if (newStatus !== 'Completed' && oldStatus === 'Completed' && data?.completed_at) {
            await base44.asServiceRole.entities.Feedback.update(feedbackId, {
                completed_at: null
            });
        }

        return Response.json({ success: true });

    } catch (error) {
        console.error('Error in updateFeedbackCompletionDate:', error.message);
        return Response.json({ success: false, message: error.message }, { status: 500 });
    }
});