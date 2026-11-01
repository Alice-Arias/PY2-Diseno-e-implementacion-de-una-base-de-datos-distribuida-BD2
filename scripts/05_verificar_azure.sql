/*---------------------------------------------------------------------------------------*
* SCRIPT: 05_verificar_azure.sql
* DÓNDE: CORPORATIVO (Azure SQL Database), conectado a la base WWI_Corporativo.
*-----------------------------------------------------------------------------------------*/
SELECT
    DB_NAME()                                          AS Base,
    DATABASEPROPERTYEX(DB_NAME(), 'Edition')           AS Edicion,
    DATABASEPROPERTYEX(DB_NAME(), 'ServiceObjective')  AS Nivel,
    CAST(SERVERPROPERTY('EngineEdition') AS INT)       AS TipoMotor,   -- 5 = Azure SQL Database
    @@VERSION                                          AS Version;
