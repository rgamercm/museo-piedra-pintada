// Variables de entorno para el entorno de pruebas (no toca .env real)
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'secreto-solo-para-pruebas-automatizadas-1234567890';
delete process.env.DATABASE_URL;
delete process.env.SUPABASE_URL;
