-- Run against the disposable GitHub CI container.
CREATE ROLE grantum_migrator LOGIN PASSWORD 'fixture-migrator' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE grantum_app LOGIN PASSWORD 'fixture-runtime' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE DATABASE grantum_test OWNER grantum_migrator;
REVOKE ALL ON DATABASE grantum_test FROM PUBLIC;
GRANT CONNECT ON DATABASE grantum_test TO grantum_app;
\connect grantum_test
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO grantum_app;
ALTER DEFAULT PRIVILEGES FOR ROLE grantum_migrator IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO grantum_app;
