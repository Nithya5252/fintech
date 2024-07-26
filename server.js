const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Replace with your Hasura endpoint and admin secret
const HASURA_GRAPHQL_ENDPOINT = 'http://localhost:8080/v1/graphql'; // Replace with your Hasura endpoint
const HASURA_ADMIN_SECRET = 'youradminsecretkey'; // Replace with your Hasura admin secret

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Function to perform GraphQL requests
const performGraphQLRequest = async (query, variables = {}) => {
  try {
    const response = await axios.post(
      HASURA_GRAPHQL_ENDPOINT,
      { query, variables },
      {
        headers: {
          'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error performing GraphQL request:', error);
    throw error;
  }
};

// Endpoint to handle transactions
app.post('/transaction', async (req, res) => {
  const { type, amount } = req.body;
  
  if (!type || !amount) {
    return res.status(400).send('Type and amount are required');
  }

  try {
    // Get the current balance
    const balanceQuery = `
      query {
        users {
          balance
        }
      }
    `;
    const balanceResponse = await performGraphQLRequest(balanceQuery);
    const currentBalance = balanceResponse.data.users[0].balance;

    // Perform the transaction
    let newBalance;
    if (type === 'deposit') {
      newBalance = currentBalance + parseFloat(amount);
    } else if (type === 'withdraw') {
      if (currentBalance < amount) {
        return res.status(400).send('Insufficient balance');
      }
      newBalance = currentBalance - parseFloat(amount);
    } else {
      return res.status(400).send('Invalid transaction type');
    }

    // Update the balance in the database
    const updateBalanceMutation = `
      mutation($balance: Float!) {
        update_users(where: {}, _set: {balance: $balance}) {
          affected_rows
        }
      }
    `;
    await performGraphQLRequest(updateBalanceMutation, { balance: newBalance });

    res.send(`Transaction successful. New balance: $${newBalance.toFixed(2)}`);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
