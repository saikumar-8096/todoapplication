const format = require("date-fns/format");
const isValid = require("date-fns/isValid");
const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
const path = require("path");
const dbpath = path.join(__dirname, "todoApplication.db");
let db = null;

const initializeDbandserver = async (request, response) => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbandserver();

const hasstatusproperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const haspriorityproperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const haspriorityandstatusproperty = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hascategoryandstatusproperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hascategoryproperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

//get list of all todo's
app.get("/todos/", async (request, response) => {
  let data = null;
  let todoQuery = "";
  const { q_search = "", priority, status, category } = request.query;
  switch (true) {
    case haspriorityandstatusproperty(request.query):
      todoQuery = `
            SELECT 
                * 
            FROM  
                todo
            WHERE 
                todo LIKE "%${q_search}%"
                AND priority = '${priority}'
                AND status = '${status}';
        `;
      break;
    case hascategoryandstatusproperty(request.query):
      todoQuery = `
            SELECT 
                * 
            FROM  
                todo
            WHERE 
                todo LIKE "%${q_search}%"
                AND category = '${category}'
                AND status = '${status}';
        `;
      break;
    case hasstatusproperty(request.query):
      todoQuery = `
            SELECT *
            FROM todo
            WHERE 
                todo LIKE "%${q_search}%"
                AND status = '${status}';
        `;
      break;
    case haspriorityproperty(request.query):
      todoQuery = `
            SELECT 
                * 
            FROM  
                todo
            WHERE 
                todo LIKE "%${q_search}%"
                AND priority = '${priority}';
        `;
      break;
    case hascategoryproperty(request.query):
      todoQuery = `
            SELECT 
                * 
            FROM  
                todo
            WHERE 
                todo LIKE "%${q_search}%"
                AND category = '${category}';
        `;
    default:
      todoQuery = `
            SELECT 
                * 
            FROM  
                todo
            WHERE 
                todo LIKE "%${q_search}%";
        `;
  }
  data = await db.all(todoQuery);
  response.send(
    data.map((eachobject) => {
      return {
        id: eachobject.id,
        todo: eachobject.todo,
        priority: eachobject.priority,
        status: eachobject.status,
        category: eachobject.category,
        dueDate: eachobject.due_date,
      };
    })
  );
});

//return specific todo based on todo id
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const gettodoQuery = `
        SELECT 
            * 
        FROM 
            todo 
        WHERE 
             id = ${todoId};`;
  const eachobject = await db.get(gettodoQuery);
  response.send({
    id: eachobject.id,
    todo: eachobject.todo,
    priority: eachobject.priority,
    status: eachobject.status,
    category: eachobject.category,
    dueDate: eachobject.due_date,
  });
});

//get list of all todo with specific duedate
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const formatedDate = format(new Date(date), "yyyy-MM-dd");

  const isvalid = isValid(new Date(formatedDate));
  if (isvalid === true) {
    const todoquery = `SELECT * FROM todo WHERE due_date = ${formatedDate};`;
    const data = await db.all(todoquery);
    response.send(
      data.map((eachobject) => {
        return {
          id: eachobject.id,
          todo: eachobject.todo,
          priority: eachobject.priority,
          status: eachobject.status,
          category: eachobject.category,
          dueDate: eachobject.due_date,
        };
      })
    );
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//create a todo in the todo table
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const formatedDate = format(new Date(dueDate), "yyyy-MM-dd");

  const isvalid = isValid(new Date(formatedDate));
  if (isvalid === true) {
    const createtodoQuery = `
        INSERT INTO 
            todo(id,todo,priority,status,category,due_date)
        VALUES
            (
                ${id},'${todo}','${priority}','${status}','${category}','${formatedDate}'
            )
    ;`;
    await db.run(createtodoQuery);
    response.send("Todo Successfully Added");
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});
//update details of specific todo
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;
  let updatedColumn = "";
  let responseText = "";
  switch (true) {
    case requestBody.status !== undefined:
      if (
        requestBody.status === "TO DO" ||
        requestBody.status === "IN PROGRESS" ||
        requestBody.status === "DONE"
      ) {
        updatedColumn = "Status";
      } else {
        responseText = "Invalid Todo Status";
      }
      break;
    case requestBody.priority !== undefined:
      if (
        requestBody.priority === "HIGH" ||
        requestBody.priority === "MEDIUM" ||
        requestBody.priority === "LOW"
      ) {
        updatedColumn = "Priority";
      } else {
        responseText = "Invalid Todo Priority";
      }
      break;
    case requestBody.category !== undefined:
      if (
        requestBody.category === "WORK" ||
        requestBody.category === "HOME" ||
        requestBody.category === "LEARNING"
      ) {
        updatedColumn = "Category";
      } else {
        responseText = "Invalid Todo Category";
      }
      break;
    case requestBody.dueDate !== undefined:
      const formatedDate = format(new Date(requestBody.dueDate), "yyyy-MM-dd");
      const isvalid = isValid(new Date(formatedDate));
      if (isvalid === true) {
        updatedColumn = "Due Date";
      } else {
        responseText = "Invalid Due Date";
      }
      break;
    case requestBody.todo !== undefined:
      updatedColumn = "Todo";
      break;
    default:
      updatedColumn = "";
  }

  if (updatedColumn === "") {
    response.status(400);
    response.send(responseText);
  } else {
    const previoustodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
    const previoustodo = await db.get(previoustodoQuery);
    const {
      todo = previoustodo.todo,
      priority = previoustodo.priority,
      status = previoustodo.status,
      category = previoustodo.category,
      dueDate = previoustodo.due_date,
    } = request.body;
    const updateTodoQuery = `
            UPDATE todo
            SET 
                todo = '${todo}',
                priority = '${priority}',
                status = '${status}',
                category = '${category}',
                due_date = ${dueDate}
            WHERE 
                id = ${todoId};`;
    await db.run(updateTodoQuery);
    response.send(`${updatedColumn} Updated`);
  }
});

//delete a todo from todo
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `
        DELETE FROM todo 
        WHERE 
            id = ${todoId};
    `;
  await db.run(deleteQuery);
  response.send("Todo Deleted");
});

module.exports = app;
