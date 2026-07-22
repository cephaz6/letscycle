-- Dev-only credential store for the dummy Cognito stand-in, so passwords live
-- with the database rather than a side-car file that can drift or be lost.
CREATE TABLE "devAuthCredential" (
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "cognitoSub" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "devAuthCredential_pkey" PRIMARY KEY ("email")
);

CREATE UNIQUE INDEX "devAuthCredential_cognitoSub_key" ON "devAuthCredential"("cognitoSub");
