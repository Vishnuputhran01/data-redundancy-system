const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check
  if (req.method === 'GET') {
    return res.json({
      status: 'ACTIVE',
      service: 'Data Redundancy System',
      provider: 'Vercel + Supabase',
      timestamp: new Date().toISOString()
    });
  }

  // Process data
  if (req.method === 'POST') {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
      );

      const { content } = req.body;

      if (!content || content.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Content is required'
        });
      }

      const trimmedContent = content.trim();

      // Check for duplicates
      const { data: existing, error: queryError } = await supabase
        .from('user_data')
        .select('*')
        .eq('content', trimmedContent)
        .limit(1);

      if (queryError) throw queryError;

      if (existing && existing.length > 0) {
        // Duplicate found
        return res.json({
          success: true,
          status: 'DUPLICATE',
          message: 'Data already exists in database',
          duplicate: true,
          existingId: existing[0].id,
          existingContent: existing[0].content,
          existingTimestamp: existing[0].created_at
        });
      } else {
        // Store unique data
        const { data: newData, error: insertError } = await supabase
          .from('user_data')
          .insert([{ content: trimmedContent }])
          .select();

        if (insertError) throw insertError;

        return res.json({
          success: true,
          status: 'UNIQUE',
          message: 'Data stored successfully',
          duplicate: false,
          documentId: newData[0].id,
          content: trimmedContent,
          timestamp: newData[0].created_at
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Database error',
        details: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};