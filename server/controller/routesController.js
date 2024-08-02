import { findRoutes, findPlanets, findCompanies } from "../services/routesService"

export async function getRoutes(req, res) {
    const from = req.query.from
    const to = req.query.to
    
    const validInput = validateInput([from, to])
    if (!validInput) {
        return res.status(400).json("Invalid parameters")
    }

    const routes = await findRoutes(from, to)
    return res.status(200).json(routes)
}

export async function getPlanets(_, res) {
    const planets = await findPlanets()
    return res.status(200).json(planets)
}

export async function getCompanies(_, res) {
    const companies = await findCompanies()
    return res.status(200).json(companies)
}

function validateInput(inputs) {
    for (const input of inputs) {
        if (input && input.length > 0 && input.trim() !== "") continue
        else return false
    }
    return true
}