import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Check for Keys
    const jwt = process.env.PINATA_JWT;
    const gateway = process.env.PINATA_GATEWAY;

    if (!jwt || !gateway) {
      console.error("❌ ERROR: PINATA_JWT or PINATA_GATEWAY missing in .env.local");
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    // 2. Get the File
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log(`📤 Uploading ${file.name} to Pinata via Fetch...`);

    // 3. Prepare the Upload 
    const uploadData = new FormData();
    uploadData.append("file", file);
    
    const metadata = JSON.stringify({ name: file.name });
    uploadData.append("pinataMetadata", metadata);

    const options = JSON.stringify({ cidVersion: 1 });
    uploadData.append("pinataOptions", options);

    // 4. Send directly to Pinata API 
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: uploadData,
    });

    // 5. Handle Response
    if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Pinata API Error:", errorText);
        throw new Error(`Pinata Upload Failed: ${res.statusText}`);
    }

    const json = await res.json();
    const ipfsHash = json.IpfsHash;
    
    console.log("✅ Upload Success! CID:", ipfsHash);

    // 6. Return the URL
    const cleanGateway = gateway.replace("https://", "").replace("/", "");
    const ipfsUrl = `https://${cleanGateway}/ipfs/${ipfsHash}`;
    
    return NextResponse.json({ 
        url: ipfsUrl, 
        hash: ipfsHash 
    }, { status: 200 });

  } catch (e) {
    console.error("❌ UPLOAD CRASHED:", e);
    return NextResponse.json(
        { error: "Internal Server Error" }, 
        { status: 500 }
    );
  }
}