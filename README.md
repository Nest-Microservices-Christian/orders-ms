<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

# Orders Microservice

## Description

Microservice for managing orders. Fernando Herrera's course project.

## Dev

1. Clone the repository
2. Run `npm install` to install dependencies
3. Create a `.env` based on the `.env.template` file
4. Run prisma migrations with `npx prisma migrate dev`
5. Run the app with `npm run start:dev`

## Production

Execute the following command to build the project:

```
docker build -f dockerfile.prod -t orders-ms .
```

## License

Nest is [MIT licensed](LICENSE).
