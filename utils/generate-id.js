import crypto from "crypto";

export const generateUserId = () => {
  return `USR_${crypto.randomBytes(8).toString("hex")}`;
};

export const generateProductId = () => {
  return `PRD_${crypto.randomBytes(8).toString("hex")}`;
};

export const generateOrderId = () => {
  return `ORD_${crypto.randomBytes(8).toString("hex")}`;
};

export const generateCartId = () => {
  return `CART_${crypto.randomBytes(8).toString("hex")}`;
};

export const generateCartItemId = () => {
  return `CITEM_${crypto.randomBytes(8).toString("hex")}`;
};

export const generateOrderItemId = () => {
  return `OITEM_${crypto.randomBytes(8).toString("hex")}`;
};