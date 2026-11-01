/*---------------------------------------------------------------------------------------*
* SCRIPT: 02_restaurar_wwi_limon.sql
* DÓNDE: LIMÓN (Docker). En SSMS conéctese a:  localhost,1434   usuario: sa
* ANTES: copie WideWorldImporters-Full.bak en la carpeta docker/backups.
*-----------------------------------------------------------------------------------------*/

-- PASO 1: ver los nombres lógicos de los archivos del backup.
--         Si alguno NO coincide con los del PASO 2, cámbielo en el PASO 2.
RESTORE FILELISTONLY
FROM DISK = N'/var/opt/mssql/backup/WideWorldImporters-Full.bak';
GO

-- PASO 2: restaurar (tarda 1-3 minutos).
RESTORE DATABASE WideWorldImporters
FROM DISK = N'/var/opt/mssql/backup/WideWorldImporters-Full.bak'
WITH
    MOVE N'WWI_Primary'          TO N'/var/opt/mssql/data/WideWorldImporters.mdf',
    MOVE N'WWI_UserData'         TO N'/var/opt/mssql/data/WideWorldImporters_UserData.ndf',
    MOVE N'WWI_Log'              TO N'/var/opt/mssql/data/WideWorldImporters.ldf',
    MOVE N'WWI_InMemory_Data_1'  TO N'/var/opt/mssql/data/WideWorldImporters_InMemory_Data_1',
    STATS = 10;
GO

-- PASO 3: comprobar.
SELECT name, state_desc, compatibility_level
FROM sys.databases
WHERE name = N'WideWorldImporters';
GO
