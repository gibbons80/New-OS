import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        const { candidateId, staffData } = await req.json();

        if (!candidateId) {
            return Response.json({ error: 'candidateId is required' }, { status: 400 });
        }

        if (!staffData) {
            return Response.json({ error: 'staffData is required' }, { status: 400 });
        }

        const candidate = await base44.entities.Candidate.get(candidateId);

        if (!candidate) {
            return Response.json({ error: 'Candidate not found' }, { status: 404 });
        }

        if (candidate.stage === 'hired' && candidate.staff_id) {
            // Check if the staff member still exists
            try {
                await base44.asServiceRole.entities.Staff.get(candidate.staff_id);
                return Response.json({ message: 'Candidate already hired' }, { status: 200 });
            } catch {
                // Staff was deleted, allow re-hiring
            }
        }

        // Create Staff entity with provided staff data
        const newStaff = await base44.asServiceRole.entities.Staff.create({
            ...staffData,
            photographer_status: 'training',
            signed_off_services: [],
            profile_photo_url: null,
            user_id: null,
            email: null,
        });

        // Fetch and sync candidate notes to StaffNote
        const candidateNotes = await base44.asServiceRole.entities.CandidateNote.filter({
            candidate_id: candidateId
        }, '-created_date');

        if (candidateNotes && candidateNotes.length > 0) {
            for (const candNote of candidateNotes) {
                await base44.asServiceRole.entities.StaffNote.create({
                    staff_id: newStaff.id,
                    staff_name: newStaff.legal_full_name,
                    note: candNote.note,
                    note_type: 'general',
                    author_id: candNote.author_id,
                    author_name: candNote.author_name,
                });
            }
        }

        // Update Candidate stage
        await base44.entities.Candidate.update(candidateId, {
            stage: 'hired',
            staff_id: newStaff.id,
        });

        return Response.json({ success: true, staff: newStaff });
    } catch (error) {
        console.error('Error hiring candidate:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});