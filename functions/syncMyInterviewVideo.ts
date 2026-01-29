import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidate_id, email } = await req.json();

    if (!candidate_id || !email) {
      return Response.json({ error: 'candidate_id and email are required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('MYINTERVIEW_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'MyInterview API key not configured' }, { status: 500 });
    }

    // Fetch interviews for this candidate from MyInterview API
    // Adjust the endpoint based on MyInterview's actual API documentation
    const response = await fetch(`https://api.myinterview.com/v1/interviews?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({ 
        error: 'Failed to fetch from MyInterview API',
        details: errorText,
        status: response.status
      }, { status: 500 });
    }

    const data = await response.json();

    // Extract the video URL from the response
    // Adjust based on actual API response structure
    let videoUrl = null;
    if (data.interviews && data.interviews.length > 0) {
      // Get the most recent interview
      const latestInterview = data.interviews[0];
      videoUrl = latestInterview.video_url || latestInterview.share_url || latestInterview.url;
    }

    if (!videoUrl) {
      return Response.json({ 
        success: false,
        message: 'No interview video found for this email'
      });
    }

    // Update the candidate with the video URL
    await base44.asServiceRole.entities.Candidate.update(candidate_id, {
      interview_url: videoUrl
    });

    return Response.json({ 
      success: true,
      video_url: videoUrl,
      message: 'Video synced successfully'
    });

  } catch (error) {
    console.error('Error syncing MyInterview video:', error);
    return Response.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
});