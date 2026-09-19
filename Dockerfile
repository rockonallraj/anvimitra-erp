# Anvi Mitra ERP — Production Container
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Install production dependencies
COPY erp/package*.json ./erp/
RUN cd erp && npm ci --omit=dev

# Copy entire application source
COPY . .

# Expose ERP API Port
EXPOSE 4000

# Run the ERP backend server
WORKDIR /app/erp
CMD ["npm", "start"]
