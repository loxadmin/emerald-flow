-- Grant execution permissions for record_swift_delivery to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.record_swift_delivery(uuid, text, date, integer, text, jsonb, jsonb) TO authenticated, service_role;
