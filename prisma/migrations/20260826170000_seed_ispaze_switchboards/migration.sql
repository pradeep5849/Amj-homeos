-- Seed the verified iSpaze configurations captured in Issue #22.
-- Pricing is intentionally excluded. The two catalogue entries whose manufacturer codes
-- were explicitly marked inconsistent are not guessed here; Super Admin can add them
-- after code verification.
WITH models(module_size,code,label,switches,fans,sockets,heavy,doorbell) AS (VALUES
 ('2M','2M4S','4 Switch',4,0,0,0,0),('2M','2M1H','1 Heavy Switch',0,0,0,1,0),('2M','2MDB','Door Bell',0,0,0,0,1),
 ('4M','4M6S','6 Switch',6,0,0,0,0),('4M','4M4S1F','4 Switch + 1 Fan',4,1,0,0,0),('4M','4M4S1SKT','4 Switch + 1 Socket',4,0,1,0,0),
 ('6M','6M10S','10 Switch',10,0,0,0,0),('6M','6M8S1F','8 Switch + 1 Fan',8,1,0,0,0),('6M','6M5S2F','5 Switch + 2 Fan',5,2,0,0,0),('6M','6M4S1F1SKT','4 Switch + 1 Fan + 1 Socket',4,1,1,0,0),('6M','6M6S1SKT','6 Switch + 1 Socket',6,0,1,0,0),('6M','6M4S2SKT','4 Switch + 2 Socket',4,0,2,0,0),
 ('8M','8M10S1SKT','10 Switch + 1 Socket',10,0,1,0,0),('8M','8M8S1F1SKT','8 Switch + 1 Fan + 1 Socket',8,1,1,0,0),('8M','8M5S2F1SKT','5 Switch + 2 Fan + 1 Socket',5,2,1,0,0),('8M','8M4S1F2SKT','4 Switch + 1 Fan + 2 Socket',4,1,2,0,0),('8M','8M6S2SKT','6 Switch + 2 Socket',6,0,2,0,0),
 ('12M','12M10S2SKT','10 Switch + 2 Socket',10,0,2,0,0),('12M','12M5S2F2SKT','5 Switch + 2 Fan + 2 Socket',5,2,2,0,0),
 ('16/18M','16/18M10S2SKT','10 Switch + 2 Socket',10,0,2,0,0),('16/18M','16/18M5S2F2SKT','5 Switch + 2 Fan + 2 Socket',5,2,2,0,0)
)
INSERT INTO "SwitchboardCatalogModel"("id","brand","moduleSize","configurationCode","displayName","configurationLabel","isActive","needsCodeVerification","createdAt","updatedAt")
SELECT md5('ispaze:'||code)::uuid,'iSpaze',module_size,code,'iSpaze '||code,label,true,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM models
ON CONFLICT ("brand","configurationCode") DO NOTHING;

WITH codes(code) AS (VALUES ('2M4S'),('2M1H'),('2MDB'),('4M6S'),('4M4S1F'),('4M4S1SKT'),('6M10S'),('6M8S1F'),('6M5S2F'),('6M4S1F1SKT'),('6M6S1SKT'),('6M4S2SKT'),('8M10S1SKT'),('8M8S1F1SKT'),('8M5S2F1SKT'),('8M4S1F2SKT'),('8M6S2SKT'),('12M10S2SKT'),('12M5S2F2SKT'),('16/18M10S2SKT'),('16/18M5S2F2SKT')),
protocols(protocol) AS (VALUES ('WIFI'::"DeviceProtocol"),('ZIGBEE'::"DeviceProtocol"),('TUYA'::"DeviceProtocol"))
INSERT INTO "SwitchboardCatalogProtocol"("id","catalogModelId","protocol","isActive","createdAt","updatedAt")
SELECT md5('ispaze:'||c.code||':'||p.protocol::text)::uuid,md5('ispaze:'||c.code)::uuid,p.protocol,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM codes c CROSS JOIN protocols p
ON CONFLICT ("catalogModelId","protocol") DO UPDATE SET "isActive"=true,"updatedAt"=CURRENT_TIMESTAMP;

WITH models(code,switches,fans,sockets,heavy,doorbell) AS (VALUES
 ('2M4S',4,0,0,0,0),('2M1H',0,0,0,1,0),('2MDB',0,0,0,0,1),('4M6S',6,0,0,0,0),('4M4S1F',4,1,0,0,0),('4M4S1SKT',4,0,1,0,0),('6M10S',10,0,0,0,0),('6M8S1F',8,1,0,0,0),('6M5S2F',5,2,0,0,0),('6M4S1F1SKT',4,1,1,0,0),('6M6S1SKT',6,0,1,0,0),('6M4S2SKT',4,0,2,0,0),('8M10S1SKT',10,0,1,0,0),('8M8S1F1SKT',8,1,1,0,0),('8M5S2F1SKT',5,2,1,0,0),('8M4S1F2SKT',4,1,2,0,0),('8M6S2SKT',6,0,2,0,0),('12M10S2SKT',10,0,2,0,0),('12M5S2F2SKT',5,2,2,0,0),('16/18M10S2SKT',10,0,2,0,0),('16/18M5S2F2SKT',5,2,2,0,0)),
expanded AS (
 SELECT code,g AS position,'SWITCH'::"SwitchboardControlType" AS type,'Switch '||g AS label,'["power"]'::jsonb AS caps FROM models CROSS JOIN LATERAL generate_series(1,switches) g
 UNION ALL SELECT code,switches+g,'FAN'::"SwitchboardControlType",'Fan '||g,'["power","speed"]'::jsonb FROM models CROSS JOIN LATERAL generate_series(1,fans) g
 UNION ALL SELECT code,switches+fans+g,'SOCKET'::"SwitchboardControlType",'Socket '||g,'["power"]'::jsonb FROM models CROSS JOIN LATERAL generate_series(1,sockets) g
 UNION ALL SELECT code,switches+fans+sockets+g,'HEAVY_SWITCH'::"SwitchboardControlType",'Heavy Switch '||g,'["power"]'::jsonb FROM models CROSS JOIN LATERAL generate_series(1,heavy) g
 UNION ALL SELECT code,switches+fans+sockets+heavy+g,'DOORBELL'::"SwitchboardControlType",'Door Bell','["power"]'::jsonb FROM models CROSS JOIN LATERAL generate_series(1,doorbell) g
)
INSERT INTO "SwitchboardCatalogChannel"("id","catalogModelId","position","controlType","defaultLabel","capabilities","createdAt","updatedAt")
SELECT md5('ispaze:'||code||':channel:'||position)::uuid,md5('ispaze:'||code)::uuid,position,type,label,caps,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM expanded
ON CONFLICT ("catalogModelId","position") DO NOTHING;
