import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Get the webhook payload
    const payload = await req.json();
    
    console.log('Received MyInterview webhook:', JSON.stringify(payload, null, 2));

    // Extract candidate information from the webhook payload
    // Try multiple possible field names from MyInterview
    const candidateName = payload.candidate_name || payload.name || payload.full_name || payload.candidate?.name;
    const candidateEmail = payload.email || payload.candidate_email || payload.candidate?.email;
    const candidateLocation = payload.location || payload.address || payload.city || payload.candidate?.location;
    
    // Try extensive list of possible video URL fields (check case variations)
    const videoUrl = payload.interview_URL ||  // MyInterview uses this
                     payload.video_url || 
                     payload.share_url || 
                     payload.interview_url || 
                     payload.video_link ||
                     payload.interview_link ||
                     payload.submission_url ||
                     payload.watch_url ||
                     payload.url ||
                     payload.video?.url ||
                     payload.interview?.url ||
                     payload.interview?.video_url ||
                     payload.submission?.url ||
                     payload.submission?.video_url;

    if (!candidateName || !candidateEmail) {
      console.error('Missing required fields:', { candidateName, candidateEmail });
      return Response.json({ 
        error: 'Missing required candidate information (name or email)' 
      }, { status: 400 });
    }

    // Create Base44 client with service role (no user auth needed for webhooks)
    const base44 = createClientFromRequest(req);

    // Check if candidate with this email already exists
    const existingCandidates = await base44.asServiceRole.entities.Candidate.filter({
      email: candidateEmail
    });

    if (existingCandidates.length > 0) {
      // Update existing candidate with video URL if provided
      if (videoUrl) {
        await base44.asServiceRole.entities.Candidate.update(existingCandidates[0].id, {
          interview_url: videoUrl
        });
      }
      
      return Response.json({ 
        success: true,
        message: 'Candidate already exists, updated video URL',
        candidate_id: existingCandidates[0].id
      });
    }

    // Create new candidate
    const newCandidate = await base44.asServiceRole.entities.Candidate.create({
      legal_full_name: candidateName,
      email: candidateEmail,
      address: candidateLocation || '',
      stage: 'my_interview_completed',
      interview_url: videoUrl || ''
    });

    console.log('Created new candidate:', newCandidate.id);

    return Response.json({ 
      success: true,
      message: 'Candidate created successfully',
      candidate_id: newCandidate.id
    });

  } catch (error) {
    console.error('Error processing MyInterview webhook:', error);
    return Response.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
});