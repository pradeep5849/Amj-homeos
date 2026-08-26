-- Complete the 23-model iSpaze catalogue used by the compact control UI.
-- The manufacturer labels include one fan while the printed codes omit 1F, so these
-- two entries remain flagged for code verification instead of silently rewriting the code.
WITH models(module_size,code,label) AS (VALUES
 ('12M','12M8S2SKT','8 Switch + 1 Fan + 2 Socket'),
 ('16/18M','16/18M8S2SKT','8 Switch + 1 Fan + 2 Socket')
)
INSERT INTO "SwitchboardCatalogModel"("id","brand","moduleSize","configurationCode","displayName","configurationLabel","isActive","needsCodeVerification","createdAt","updatedAt")
SELECT md5('ispaze:'||code)::uuid,'iSpaze',module_size,code,'iSpaze '||code,label,true,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM models
ON CONFLICT ("brand","configurationCode") DO UPDATE SET "configurationLabel"=EXCLUDED."configurationLabel","isActive"=true,"needsCodeVerification"=true,"updatedAt"=CURRENT_TIMESTAMP;

WITH codes(code) AS (VALUES ('12M8S2SKT'),('16/18M8S2SKT')),
protocols(protocol) AS (VALUES ('WIFI'::"DeviceProtocol"),('ZIGBEE'::"DeviceProtocol"),('TUYA'::"DeviceProtocol"))
INSERT INTO "SwitchboardCatalogProtocol"("id","catalogModelId","protocol","isActive","createdAt","updatedAt")
SELECT md5('ispaze:'||c.code||':'||p.protocol::text)::uuid,md5('ispaze:'||c.code)::uuid,p.protocol,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM codes c CROSS JOIN protocols p
ON CONFLICT ("catalogModelId","protocol") DO UPDATE SET "isActive"=true,"updatedAt"=CURRENT_TIMESTAMP;

WITH models(code,switches,fans,sockets) AS (VALUES
 ('12M8S2SKT',8,1,2),('16/18M8S2SKT',8,1,2)
), expanded AS (
 SELECT code,g AS position,'SWITCH'::"SwitchboardControlType" AS type,'Switch '||g AS label,'["power"]'::jsonb AS caps FROM models CROSS JOIN LATERAL generate_series(1,switches) g
 UNION ALL SELECT code,switches+g,'FAN'::"SwitchboardControlType",'Fan '||g,'["power","speed"]'::jsonb FROM models CROSS JOIN LATERAL generate_series(1,fans) g
 UNION ALL SELECT code,switches+fans+g,'SOCKET'::"SwitchboardControlType",'Socket '||g,'["power"]'::jsonb FROM models CROSS JOIN LATERAL generate_series(1,sockets) g
)
INSERT INTO "SwitchboardCatalogChannel"("id","catalogModelId","position","controlType","defaultLabel","capabilities","createdAt","updatedAt")
SELECT md5('ispaze:'||code||':channel:'||position)::uuid,md5('ispaze:'||code)::uuid,position,type,label,caps,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM expanded
ON CONFLICT ("catalogModelId","position") DO NOTHING;
