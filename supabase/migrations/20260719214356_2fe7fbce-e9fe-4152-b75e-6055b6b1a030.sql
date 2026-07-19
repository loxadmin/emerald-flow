
INSERT INTO public.admin_settings (key, value, description) VALUES
  ('ai_provider', 'lovable', 'AI provider for Karbali Assistant: lovable | gemini | openai'),
  ('ai_model', 'google/gemini-2.5-flash', 'Model id. Lovable: google/gemini-2.5-flash. Gemini: gemini-2.0-flash. OpenAI: gpt-4o-mini')
ON CONFLICT (key) DO NOTHING;
