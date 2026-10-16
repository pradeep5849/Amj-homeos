-- Home Assistant canonical device bindings. Credentials remain in the local hub vault.
CREATE TABLE "HomeAssistantEntityBinding" (
  "id" UUID NOT NULL,
  "homeId" UUID NOT NULL,
  "instanceId" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "deviceId" UUID NOT NULL,
  "isCommandOwner" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HomeAssistantEntityBinding_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HomeAssistantEntityBinding_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HomeAssistantEntityBinding_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "HomeAssistantEntityBinding_instanceId_entityId_key" ON "HomeAssistantEntityBinding"("instanceId", "entityId");
CREATE UNIQUE INDEX "HomeAssistantEntityBinding_deviceId_key" ON "HomeAssistantEntityBinding"("deviceId");
CREATE INDEX "HomeAssistantEntityBinding_homeId_instanceId_idx" ON "HomeAssistantEntityBinding"("homeId", "instanceId");

-- Prevent binding an entity to a canonical Device from another home.
CREATE FUNCTION amj_ha_binding_home_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Device" d WHERE d.id = NEW."deviceId" AND d."homeId" = NEW."homeId") THEN
    RAISE EXCEPTION 'Home Assistant binding device must belong to same home';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER amj_ha_binding_home_guard_trigger
BEFORE INSERT OR UPDATE OF "deviceId", "homeId" ON "HomeAssistantEntityBinding"
FOR EACH ROW EXECUTE FUNCTION amj_ha_binding_home_guard();
