import multer from "multer";
import { extname as _extname } from "path";
import multerS3, { AUTO_CONTENT_TYPE } from "multer-s3";
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { generate } from "shortid";
import { getContentType } from "../utils/index.js";
import dotenv from "dotenv";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
dotenv.config();

let s3 = new S3Client({
  region: process.env.Region,
  // credentials: {
  //   accessKeyId: process.env.AccesskeyID,
  //   secretAccessKey: process.env.SecretAccessKey,
  // },
  sslEnabled: false,
  s3ForcePathStyle: true,
  signatureVersion: "v4",
});

const storage = multerS3({
  s3: s3,
  bucket: process.env.BucketName,
  contentType: AUTO_CONTENT_TYPE,
  // acl: "public-read",
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req, file, cb) {
    const sanitizedFilename = file.originalname.replace(/\s+/g, "_");
    const key = generate() + "_" + sanitizedFilename;
    cb(null, key);
    console.log("Key: ", key);
  },
});

const checkFileType = (file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(_extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb("Error: Images Only!");
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

const deleteFile = async (key) => {
  const params = {
    Bucket: process.env.BucketName,
    Key: key,
  };

  try {
    await s3.send(new DeleteObjectCommand(params));
    console.log("Image deleted successfully");
  } catch (err) {
    console.error("Error deleting image:", err);
  }
};

const downloadFile = async (key, res) => {
  const params = {
    Bucket: process.env.BucketName,
    Key: key,
  };

  try {
    const { Body } = await s3.send(new GetObjectCommand(params));
    const contentType = getContentType(key);

    if (Body && typeof Body.pipe === "function") {
      // If Body is a readable stream, pipe it to the response
      Body.pipe(res);
      res.setHeader("Content-Disposition", `attachment; filename=${key}`);
      res.setHeader("Content-Type", "application/octet-stream");

      // Handle any stream errors
      Body.on("error", (error) => {
        console.error("Error streaming the file:", error);
        res.status(500).send("Error streaming the file");
      });

      // Ensure the response is sent after streaming
      res.on("close", () => {
        console.log("File download completed");
      });
    } else if (Buffer.isBuffer(Body)) {
      // If Body is a Buffer, we can send it directly as a file
      res.setHeader("Content-Disposition", `attachment; filename=${key}`);
      res.setHeader("Content-Type", "application/octet-stream");
      res.send(Body); // Send the file content as a buffer
    } else {
      console.error("Invalid Body type");
      res.status(500).send("Error downloading the file");
    }
  } catch (err) {
    console.error(`Error downloading file ${key}:`, err);
    res.status(404).send(`Can not download file ${key}: ${err.message}`);
    // or handle the error in a way that fits your application's logic
  }
};

const getFileUrl = async (key) => {
  // return `https://${process.env.BucketName}.s3.amazonaws.com/${key}`;
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.BucketName,
      Key: key,
    });

    // Generate a signed URL with a specified expiration (e.g., 1 hour)
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    return url;
  } catch (error) {
    if (error.code === "NotFound") {
      return false;
    } else {
      console.error("Error generating presigned URL:", error);
      throw error
    }
  }
};

export { upload, deleteFile, downloadFile, getFileUrl };