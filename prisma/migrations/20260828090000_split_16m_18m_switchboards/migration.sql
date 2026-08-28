-- User-verified clarification: the catalogue's combined 16/18M heading represents
-- separate physical module sizes. No-fan configuration is 16M; fan configurations are 18M.
-- Update the existing model rows in place so installed switchboards keep their foreign keys.

UPDATE "SwitchboardCatalogModel"
SET "moduleSize"='16M',
    "configurationCode"='16M10S2SKT',
    "displayName"='iSpaze 16M10S2SKT',
    "configurationLabel"='10 Switch + 2 Socket',
    "needsCodeVerification"=false,
    "updatedAt"=CURRENT_TIMESTAMP
WHERE "brand"='iSpaze' AND "configurationCode"='16/18M10S2SKT';

UPDATE "SwitchboardCatalogModel"
SET "moduleSize"='18M',
    "configurationCode"='18M8S1F2SKT',
    "displayName"='iSpaze 18M8S1F2SKT',
    "configurationLabel"='8 Switch + 1 Fan + 2 Socket',
    "needsCodeVerification"=false,
    "updatedAt"=CURRENT_TIMESTAMP
WHERE "brand"='iSpaze' AND "configurationCode"='16/18M8S2SKT';

UPDATE "SwitchboardCatalogModel"
SET "moduleSize"='18M',
    "configurationCode"='18M5S2F2SKT',
    "displayName"='iSpaze 18M5S2F2SKT',
    "configurationLabel"='5 Switch + 2 Fan + 2 Socket',
    "needsCodeVerification"=false,
    "updatedAt"=CURRENT_TIMESTAMP
WHERE "brand"='iSpaze' AND "configurationCode"='16/18M5S2F2SKT';
