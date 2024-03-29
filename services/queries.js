const { pool } = require('./config');

// Hakee drinkin nimen ja reseptin taulusta drinks.
function getDrinks() {
    return pool.connect()
        .then(client => {
                return client.query('SELECT d.id, d.drink_name, d.drink_instructions, \n' +
                    'json_agg(json_build_object(\'id\', di.id, \'ingredient_name\', di.ingredient_name, \'amount\', dr.ingredients_amount, \'unit\', dr.ingredients_unit)) \n' +
                    'AS ingredients \n' +
                    'FROM drinks_recipes dr \n' +
                    'INNER JOIN drinks_ingredients di ON di.id = dr.ingredients_id \n' +
                    'INNER JOIN drinks d ON d.id = dr.drinks_id \n' +
                    'GROUP BY \n' +
                    'd.id, d.drink_name, d.drink_instructions ORDER BY d.drink_name')
                    .then((data) => {
                            client.release();
                            return data.rows;
                        }
                    )
                    .catch(e => {
                        throw new Error(e.message)
                    })
            }
        );
}

// Hakee drinkin nimen, reseptin ja raaka-aineet käyttäen useampia tauluja. Sekavassa tilassa.
// function getDrinksWithJoin(cabinet_ingredients) {
//     const insertStmt = 'SELECT d.id, d.drink_name, d.drink_instructions, \n' +
//         'json_agg(json_build_object(\'id\', di.id, \'ingredient_name\', di.ingredient_name, \'amount\', dr.ingredients_amount, \'unit\', dr.ingredients_unit)) \n' +
//         'AS ingredients \n' +
//         'FROM drinks_recipes dr \n' +
//         'INNER JOIN drinks_ingredients di ON di.id = dr.ingredients_id \n' +
//         'INNER JOIN drinks d ON d.id = dr.drinks_id \n' +
//         'WHERE d.drink_name ILIKE $1 GROUP BY \n' +
//         'd.id, d.drink_name, d.drink_instructions';
//     return pool.connect()
//         .then(client => {
//                 return client.query(query)
//                     .then((data) => {
//                             client.release();
//                             return data.rows;
//                         }
//                     )
//                     .catch(e => {
//                         throw new Error(e.message)
//                     })
//             }
//         );
// }

function getDrinkById (id){
    return pool.connect()
        .then(client => {
                return client.query('SELECT * FROM drinks WHERE id = $1', [id])
                    .then((data) => {
                        client.release();
                        return data.rows[0];
                    })
                    .catch(e => {
                        throw new Error(e.message)
                    })
            })
}

function getDrinkByName (drinkName){
    const insertStmt = 'SELECT d.id, d.drink_name, d.drink_instructions, \n' +
        'json_agg(json_build_object(\'id\', di.id, \'ingredient_name\', di.ingredient_name, \'amount\', dr.ingredients_amount, \'unit\', dr.ingredients_unit)) \n' +
        'AS ingredients \n' +
        'FROM drinks_recipes dr \n' +
        'INNER JOIN drinks_ingredients di ON di.id = dr.ingredients_id \n' +
        'INNER JOIN drinks d ON d.id = dr.drinks_id \n' +
        'WHERE d.drink_name ILIKE $1 GROUP BY \n' +
        'd.id, d.drink_name, d.drink_instructions';

    return pool.connect()
        .then(client => {
            return client.query(insertStmt, ['%' + drinkName + '%'])
                .then((data) => {
                    client.release();
                    return data.rows;
                })
                .catch(e => {
                    throw new Error(e.message)
                })
        })
}

function addDrink(newdrink) {

    const insertStmt = "INSERT INTO drinks(drink_name, drink_instructions) VALUES($1, $2) RETURNING id";

    return pool.connect()
        .then(client => {
                return client.query(insertStmt, [newdrink.drink_name, newdrink.drink_instructions])
                    .then((data) => {
                            client.release();
                            return data.rows[0];
                        }
                    )
                    .catch(e => {
                        console.log("queries:post virhe", e.message);
                        throw new Error(e.message)
                    })
            }
        );
}

async function addDrinkRecipe(newDrink) {
    let drinkId = -1;
    await addDrink(newDrink)
        .then(response => {
            drinkId = response.id;
        })
        .catch(e=>{
            throw new Error('Virhe drinkin luonnissa: nimi, resepti..' + e.message)
        })
    //Täällä LIMIT yhteen
    const insertStmt = 'INSERT INTO drinks_recipes (drinks_id, ingredients_id, ingredients_amount, ingredients_unit) VALUES ((SELECT id from drinks WHERE id = $1), (SELECT id from drinks_ingredients WHERE ingredient_name ILIKE $2 LIMIT 1), $3, $4) RETURNING id';

    return pool.connect()
        .then(client => {
            return client.query(insertStmt, [drinkId, '%' + newDrink.drink_ingredient + '%', newDrink.ingredientAmount, newDrink.ingredientUnit])
                .then((data) => {
                    client.release();
                    return data.rows[0];
                })
                .catch(e=> {
                    console.log("Creating new drink recipe failed", e.message);
                    throw new Error(e.message);
                })
        })
}

async function addDrinkRecipe2(newDrink) {
    let drinkId = -1
    await addDrink(newDrink)
        .then(response => {
            drinkId = response.id;
        })
        .catch(e=>{
            throw new Error('Virhe drinkin luonnissa: nimi, resepti..' + e.message)
        })
    //Täällä LIMIT yhteen
    const insertStmt = 'INSERT INTO drinks_recipes (drinks_id, ingredients_id, ingredients_amount, ingredients_unit) VALUES ((SELECT id from drinks WHERE id = $1), (SELECT id from drinks_ingredients WHERE ingredient_name ILIKE $2 LIMIT 1), $3, $4) RETURNING id';

    return pool.connect()
        .then(client =>
        {
            if (newDrink.drink_ingredient0 === '' && newDrink.ingredientSearch0 === '') {
                client.release()
                return new Error('Adding drink failed')
            } else if(newDrink.drink_ingredient0 === '') {
                newDrink.drink_ingredient0 = newDrink.ingredientSearch0;
            }
                return client.query(insertStmt, [drinkId, newDrink.drink_ingredient0 + '%' , newDrink.ingredientAmount0, newDrink.ingredientUnit0])
                    .then((data) => {
                        if (newDrink.drink_ingredient1 === '') {
                            newDrink.drink_ingredient1 = newDrink.ingredientSearch1;
                        }
                        console.log("Created new drink recipe", data.rows);
                        return client.query(insertStmt,[drinkId, newDrink.drink_ingredient1 + '%', newDrink.ingredientAmount1, newDrink.ingredientUnit1])
                            .then((data) => {
                                if (newDrink.drink_ingredient2 === '') {
                                    newDrink.drink_ingredient2 = newDrink.ingredientSearch2;
                                }
                                console.log("Created new drink recipe", data.rows);
                                return client.query(insertStmt,[drinkId, newDrink.drink_ingredient2 + '%', newDrink.ingredientAmount2, newDrink.ingredientUnit2])
                                    .then((data) => {
                                        if (newDrink.drink_ingredient3 === '') {
                                            newDrink.drink_ingredient3 = newDrink.ingredientSearch3;
                                        }
                                        console.log("Created new drink recipe", data.rows);
                                        return client.query(insertStmt,[drinkId, newDrink.drink_ingredient3 + '%', newDrink.ingredientAmount3, newDrink.ingredientUnit3])
                                            .then((data) => {
                                                if (newDrink.drink_ingredient4 === '') {
                                                    newDrink.drink_ingredient4 = newDrink.ingredientSearch4;
                                                }
                                                console.log("Created new drink recipe", data.rows);
                                                return client.query(insertStmt,[drinkId, newDrink.drink_ingredient4 + '%', newDrink.ingredientAmount4, newDrink.ingredientUnit4])
                                                    .then((data) => {
                                                        if (newDrink.drink_ingredient5 === '') {
                                                            newDrink.drink_ingredient5 = newDrink.ingredientSearch5;
                                                        }
                                                        console.log("Created new drink recipe", data.rows);
                                                        return client.query(insertStmt,[drinkId, newDrink.drink_ingredient5 + '%', newDrink.ingredientAmount5, newDrink.ingredientUnit5])
                                                            .then((data) => {
                                                                if (newDrink.drink_ingredient6 === '') {
                                                                    newDrink.drink_ingredient6 = newDrink.ingredientSearch6;
                                                                }
                                                                console.log("Created new drink recipe", data.rows);
                                                                return client.query(insertStmt,[drinkId, newDrink.drink_ingredient6 + '%', newDrink.ingredientAmount6, newDrink.ingredientUnit6])
                                    .then((data) => {
                                        client.release();
                                        console.log("Created new drink recipe", data.rows);
                                        return data.rows[0];
                                    })
                                                            })
                                                    })
                                            })
                                    })
                            })

                    })
                    .catch(e => {
                        console.log("Creating new drink recipe failed", e.message);
                        throw new Error(e.message);
                    })
        })
}



function updateDrink(id, drinkData) {
    return pool.connect()
        .then(client => {
            return client.query('UPDATE drinks SET drink_name = $1, drink_instructions = $2 WHERE id = $3',
                [drinkData.drink_name, drinkData.drink_instructions, id])
                .then((data) => {
                    client.release();
                    console.log("Updated:", data.rows);
                    return drinkData;
                })
                .catch( e => {
                    console.log("queries: put virhe");
                    throw new Error(e.message);
                })
        })

}

function deleteDrink(id) {
    return pool.connect()
        .then(client => {
            return client.query('DELETE FROM drinks WHERE id = $1', [id])
                .then((data) => {
                    client.release();
                    return `"Deleted drink with id" ${id}`;
                })
                .catch( e => {
                    throw new Error(e.message)
                });
        })
}

function getIngredients() {
    return pool.connect()
        .then(client => {
                return client.query('SELECT * FROM drinks_ingredients ORDER BY ingredient_name')
                    .then((data) => {
                            client.release();
                            return data.rows;
                        }
                    )
                    .catch(e => {
                        throw new Error(e.message)
                    })
            }
        );
}
function getIngredientByName (ingredientName){
    return pool.connect()
        .then(client => {
            return client.query('SELECT * FROM drinks_ingredients WHERE ingredient_name ILIKE $1', ['%' + ingredientName + '%'])
                .then((data) => {
                    client.release();
                    return data.rows;
                })
                .catch(e => {
                    throw new Error(e.message)
                })
        })

}

async function addIngredient(newIngredient, email) {
    let list = await getIngredientByName(newIngredient.ingredient_name)
    let user = await getUser(email)
    console.log(user)
    if(list.length > 0) {
        throw new Error('Ingredient already exists in the database')
    } else {
        const insertStmt = "INSERT INTO drinks_ingredients(ingredient_name, userAdded) VALUES($1, $2) RETURNING id";
        return pool.connect()
            .then(client => {
                    return client.query(insertStmt, [newIngredient.ingredient_name, user[0].uid])
                        .then((answer) => {
                                client.release();
                                return answer.rows[0];
                            }
                        )
                        .catch(e => {
                            console.log("queries:post virhe", e.message);
                            throw new Error(e.message)
                        })
                }
            );
    }
}

function addUser(u) {
    const insertStmt = "INSERT INTO users(user_email) VALUES($1) RETURNING uid";
    return pool.connect()
        .then(client => {
            return client.query(insertStmt, [u.user_email])
                .then((answer) => {
                    client.release();
                    return answer.rows[0].id;
                })
                .catch(e => {
                    console.log("addUser virhe: " + e.message);
                    throw new Error(e.message)
                })
        })
}

function getUser(u) {
    const insertStmt = "SELECT * FROM users WHERE user_email=$1"
    return pool.connect()
        .then(client => {
            return client.query(insertStmt, [u])
                .then((answer) => {
                    client.release();
                    return answer.rows;
                })
                .catch(e => {
                    console.log("editUser virhe: " + e.message)
                    throw new Error(e.message)
                })
        })

}

async function editUser(oldEmail, newUser) {
    const insertStmt = "UPDATE users SET user_email=$1 WHERE user_email=$2"
    let list = await getUser(newUser.user_email)
    if(list.length > 0) {
        throw new Error('Email is already in use!')
    } else {
    return pool.connect()
        .then(client => {
            return client.query(insertStmt, [newUser.user_email, oldEmail])
                .then((answer) => {
                    client.release();
                    return answer.rows;
                })
                .catch(e => {
                    console.log("editUser virhe: " + e.message)
                    throw new Error(e.message)
                })
        })
    }
}

async function getOwnIngredients(u) {
    const idhaku = "SELECT uid FROM users WHERE user_email ILIKE $1";
    const insertSmt = "SELECT DISTINCT cabinet.users_id, cabinet.ingredients_id, drinks_ingredients.ingredient_name FROM cabinet INNER JOIN drinks_ingredients ON cabinet.ingredients_id = drinks_ingredients.id WHERE users_id = $1 ORDER BY drinks_ingredients.ingredient_name";
    return pool.connect()
        .then(client => {
            return client.query(idhaku, [u])
                .then((data) => {
                    return client.query(insertSmt, [data.rows[0].uid])
                        .then((answer) => {
                            client.release();
                            return answer.rows
                        })
                })
                .catch(e => {
                    throw new Error(e.message)
                })
        })
}

function addToCabinet(email, ingredient) {
    const idhaku = "SELECT uid FROM users WHERE user_email ILIKE $1";
    const insertSmt = "INSERT INTO cabinet(users_id, ingredients_id) VALUES ($1, $2) RETURNING users_id;"
    return pool.connect()
        .then(client => {
            return client.query(idhaku, [email])
                .then((data) => {
                    return client.query(insertSmt, [data.rows[0].uid, ingredient.id])
                        .then((answer) => {
                            client.release();
                            return answer.rows[0].id;
                        })
                })
                .catch(e => {
                    console.log('addToCabinet virhe: ' + e.message)
                    throw new Error(e.message);
                })
        })
}

function removeFromCabin(email, id) {
    const idhaku = "SELECT uid FROM users WHERE user_email ILIKE $1";
    const insertSmt = "DELETE FROM cabinet WHERE users_id = $1 AND ingredients_id = $2;"
    return pool.connect()
        .then(client => {
            return client.query(idhaku, [email])
                .then((data) => {
                    return client.query(insertSmt, [data.rows[0].uid, id])
                        .then((answer) => {
                            client.release();
                            return answer.rows[0];
                        })
                })
                .catch(e => {
                    console.log('removeFromCabinet virhe: ' + e.message)
                    throw new Error(e.message);
                })
        })
}

async function drinkkify(email) {
    const distinct = (value, index, self) => {
        return self.indexOf(value) === index
    }
    const drinkkify = []
    const drinkkifythree = []
    const ingredients = await getOwnIngredients(email);
    const drinks = await getDrinks();

    for (let c = 0; c < ingredients.length; c++) {
        for (let d of drinks) {
            for (let i of ingredients) {
                if(d.ingredients.length > 0) {
                    if (d.ingredients[0].id === i.ingredients_id) {
                        d.ingredients.shift();
                    }
                } else {
                    drinkkify.push(d)
                }
            }
        }
    }

    const drinkkifytwo = drinkkify.filter(distinct)
    for (let apu = 0; apu < drinkkifytwo.length; apu++) {
        drinkkifythree.push(await getOneDrinkByName(drinkkifytwo[apu].drink_name))
    }


    console.log('Koko: ' + drinkkifytwo.length)
    return drinkkifythree
}

function getOneDrinkByName (drinkName){
    const insertStmt = 'SELECT d.id, d.drink_name, d.drink_instructions, \n' +
        'json_agg(json_build_object(\'id\', di.id, \'ingredient_name\', di.ingredient_name, \'amount\', dr.ingredients_amount, \'unit\', dr.ingredients_unit)) \n' +
        'AS ingredients \n' +
        'FROM drinks_recipes dr \n' +
        'INNER JOIN drinks_ingredients di ON di.id = dr.ingredients_id \n' +
        'INNER JOIN drinks d ON d.id = dr.drinks_id \n' +
        'WHERE d.drink_name ILIKE $1 GROUP BY \n' +
        'd.id, d.drink_name, d.drink_instructions';

    return pool.connect()
        .then(client => {
            return client.query(insertStmt, ['%' + drinkName + '%'])
                .then((data) => {
                    client.release();
                    return data.rows[0];
                })
                .catch(e => {
                    throw new Error(e.message)
                })
        })
}

async function getUserIngredients(email) {
    const insertStmt = "SELECT * FROM drinks_ingredients WHERE useradded=$1";
    let user = await getUser(email)
    return pool.connect()
        .then(client => {
            return client.query(insertStmt, [user[0].uid])
                .then((data) => {
                    client.release();
                    return data.rows;
                })
                .catch(e => {
                    throw new Error(e.message)
                })
        })
}

function editUserIngredient(i, n) {
    const insertStmt = "UPDATE drinks_ingredients SET ingredient_name=$1 WHERE id=$2";
    return pool.connect()
        .then(client => {
            return client.query(insertStmt, [n, i])
                .then((data) => {
                    client.release()
                        return data.rows;
                })
                .catch(e => {
                    throw new Error(e.message)
                })
        })
}


module.exports = {
    getDrinks,
    addDrink,
    getDrinkById,
    updateDrink,
    deleteDrink,
    getDrinkByName,
    //getDrinksWithJoin,
    addDrinkRecipe,
    addDrinkRecipe2,
    getIngredients,
    getIngredientByName,
    addIngredient,
    addUser,
    editUser,
    getOwnIngredients,
    addToCabinet,
    removeFromCabin,
    drinkkify,
    getUserIngredients,
    editUserIngredient,
};
