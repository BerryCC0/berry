import { Hono } from "hono";
import { db } from "ponder:api";
import schema from "ponder:schema";
import { graphql } from "ponder";

const app = new Hono();

app.use("/graphql", graphql({ db, schema }));

export default app;
