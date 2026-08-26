-- Issue #22: seed the initial iSpaze switchboard catalog.
-- Pricing is intentionally excluded. Every model is available as WIFI and ZIGBEE.

WITH configs(module_size, code, label, switch_count, fan_count, socket_count, heavy_count, doorbell_count, verify_code) AS (
  VALUES
    ('2M','2M4S','4 Switch',4,0,0,0,0,false),
    ('2M','2M1H','1 Heavy Switch',0,0,0,1,0,false),
    ('2M','2MDB','Door Bell',0,0,0,0,1,false),
    ('4M','4M6S','6 Switch',6,0,0,0,0,false),
    ('4M','4M4S1F','4 Switch + 1 Fan',4,1,0,0,0,false),
    ('4M','4M4S1SKT','4 Switch + 1 Socket',4,0,1,0,0,false),
    ('6M','6M10S','10 Switch',10,0,0,0,0,false),
    ('6M','6M8S1F','8 Switch + 1 Fan',8,1,0,0,0,false),
    ('6M','6M5S2F','5 Switch + 2 Fan',5,2,0,0,0,false),
    ('6M','6M4S1F1SKT','4 Switch + 1 Fan + 1 Socket',4,1,1,0,0,false),
    ('6M','6M6S1SKT','6 Switch + 1 Socket',6,0,1,0,0,false),
    ('6M','6M4S2SKT','4 Switch + 2 Socket',4,0,2,0,0,false),
    ('8M','8M10S1SKT','10 Switch + 1 Socket',10,0,1,0,0,false),
    ('8M','8M8S1F1SKT','8 Switch + 1 Fan + 1 Socket',8,1,1,0,0,false),
    ('8M','8M5S2F1SKT','5 Switch + 2 Fan + 1 Socket',5,2,1,0,0,false),
    ('8M','8M4S1F2SKT','4 Switch + 1 Fan + 2 Socket',4,1,2,0,0,false),
    ('8M','8M6S2SKT','6 Switch + 2 Socket',6,0,2,0,0,false),
    ('12M','12M10S2SKT','10 Switch + 2 Socket',10,0,2,0,0,false),
    ('12M','12M8S2SKT','8 Switch + 1 Fan + 2 Socket',8,1,2,0,0,true),
    ('12M','12M5S2F2SKT','5 Switch + 2 Fan + 2 Socket',5,2,2,0,0,false),
    ('16M/18M','16/18M10S2SKT','10 Switch + 2 Socket',10,0,2,0,0,false),
    ('16M/18M','16/18M8S2SKT','8 Switch + 1 Fan + 2 Socket',8,1,2,0,0,true),
    ('16M/18M','16/18M5S2F2SKT','5 Switch + 2 Fan + 2 Socket',5,2,2,0,0,false)
), inserted AS (
  INSERT INTO "SwitchboardCatalogModel" (
    "id","brand","moduleSize","configurationCode","displayName","configurationLabel","isActive","needsCodeVerification","createdAt","updatedAt"
  )
  SELECT md5('ispaze:' || code)::uuid, 'iSpaze', module_size, code,
         module_size || ' · ' || label, label, true, verify_code, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM configs
  ON CONFLICT ("brand","configurationCode") DO UPDATE SET
    "moduleSize"=EXCLUDED."moduleSize",
    "displayName"=EXCLUDED."displayName",
    "configurationLabel"=EXCLUDED."configurationLabel",
    "needsCodeVerification"=EXCLUDED."needsCodeVerification",
    "updatedAt"=CURRENT_TIMESTAMP
  RETURNING "id","configurationCode"
)
INSERT INTO "SwitchboardCatalogProtocol" ("id","catalogModelId","protocol","isActive","createdAt","updatedAt")
SELECT md5('ispaze:' || m."configurationCode" || ':' || p.protocol)::uuid,
       m."id", p.protocol::"DeviceProtocol", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "SwitchboardCatalogModel" m
CROSS JOIN (VALUES ('WIFI'),('ZIGBEE')) AS p(protocol)
WHERE m."brand"='iSpaze'
ON CONFLICT ("catalogModelId","protocol") DO UPDATE SET "isActive"=true,"updatedAt"=CURRENT_TIMESTAMP;

WITH configs(code, switch_count, fan_count, socket_count, heavy_count, doorbell_count) AS (
  VALUES
    ('2M4S',4,0,0,0,0),('2M1H',0,0,0,1,0),('2MDB',0,0,0,0,1),
    ('4M6S',6,0,0,0,0),('4M4S1F',4,1,0,0,0),('4M4S1SKT',4,0,1,0,0),
    ('6M10S',10,0,0,0,0),('6M8S1F',8,1,0,0,0),('6M5S2F',5,2,0,0,0),('6M4S1F1SKT',4,1,1,0,0),('6M6S1SKT',6,0,1,0,0),('6M4S2SKT',4,0,2,0,0),
    ('8M10S1SKT',10,0,1,0,0),('8M8S1F1SKT',8,1,1,0,0),('8M5S2F1SKT',5,2,1,0,0),('8M4S1F2SKT',4,1,2,0,0),('8M6S2SKT',6,0,2,0,0),
    ('12M10S2SKT',10,0,2,0,0),('12M8S2SKT',8,1,2,0,0),('12M5S2F2SKT',5,2,2,0,0),
    ('16/18M10S2SKT',10,0,2,0,0),('16/18M8S2SKT',8,1,2,0,0),('16/18M5S2F2SKT',5,2,2,0,0)
), expanded AS (
  SELECT c.code, gs AS position, 'SWITCH'::"SwitchboardControlType" AS control_type, 'Switch ' || gs AS label, '["power"]'::jsonb AS caps
  FROM configs c CROSS JOIN LATERAL generate_series(1,c.switch_count) gs
  UNION ALL
  SELECT c.code, c.switch_count+gs, 'FAN'::"SwitchboardControlType", 'Fan ' || gs, '["power","speed"]'::jsonb
  FROM configs c CROSS JOIN LATERAL generate_series(1,c.fan_count) gs
  UNION ALL
  SELECT c.code, c.switch_count+c.fan_count+gs, 'SOCKET'::"SwitchboardControlType", 'Socket ' || gs, '["power"]'::jsonb
  FROM configs c CROSS JOIN LATERAL generate_series(1,c.socket_count) gs
  UNION ALL
  SELECT c.code, c.switch_count+c.fan_count+c.socket_count+gs, 'HEAVY_SWITCH'::"SwitchboardControlType", 'Heavy Switch ' || gs, '["power"]'::jsonb
  FROM configs c CROSS JOIN LATERAL generate_series(1,c.heavy_count) gs
  UNION ALL
  SELECT c.code, c.switch_count+c.fan_count+c.socket_count+c.heavy_count+gs, 'DOORBELL'::"SwitchboardControlType", 'Door Bell', '["power"]'::jsonb
  FROM configs c CROSS JOIN LATERAL generate_series(1,c.doorbell_count) gs
)
INSERT INTO "SwitchboardCatalogChannel" ("id","catalogModelId","position","controlType","defaultLabel","capabilities","createdAt","updatedAt")
SELECT md5('ispaze:' || e.code || ':channel:' || e.position)::uuid,
       m."id", e.position, e.control_type, e.label, e.caps, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM expanded e
JOIN "SwitchboardCatalogModel" m ON m."brand"='iSpaze' AND m."configurationCode"=e.code
ON CONFLICT ("catalogModelId","position") DO UPDATE SET
  "controlType"=EXCLUDED."controlType",
  "defaultLabel"=EXCLUDED."defaultLabel",
  "capabilities"=EXCLUDED."capabilities",
  "updatedAt"=CURRENT_TIMESTAMP;
