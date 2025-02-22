const { response } = require("express");
const { LineaArticulo } = require("../../models");

const getAll = async (req, res = response) => {
  const {
    limite = 10,
    desde = 0,
    paginado = true,
    orderBy = "descripcion",
    direction = -1,
    estado = true,
    search = "",
  } = req.query;

  const query = { estado };

  if (search)
    query.descripcion = { $regex: ".*" + search + ".*", $options: "i" };

  if (paginado === "true") {
    const [total, data] = await Promise.all([
      LineaArticulo.countDocuments(query),
      LineaArticulo.find(query)
        .skip(Number(desde))
        .limit(Number(limite))
        .sort({ [orderBy]: direction }),
    ]);

    res.json({
      total,
      data,
    });
  } else {
    const data = await LineaArticulo.find(query).sort({ [orderBy]: direction });
    res.json(data);
  }
};

const getById = async (req, res = response) => {
  const { id } = req.params;
  const modelDB = await LineaArticulo.findById(id);

  res.json(modelDB);
};

const add = async (req, res = response) => {
  const descripcion = req.body.descripcion.toUpperCase();

  const modelDB = await LineaArticulo.findOne({ descripcion });

  if (modelDB) {
    return res.status(400).json({
      msg: `La LineaArticulo ${modelDB.descripcion}, ya existe`,
    });
  }
  req.body.descripcion = descripcion;

  const newModel = new LineaArticulo(req.body);

  // Guardar DB
  await newModel.save();

  res.json(newModel);
};

const update = async (req, res = response) => {
  const { id } = req.params;
  const { ...data } = req.body;

  data.descripcion = data.descripcion.toUpperCase();

  const newModel = await LineaArticulo.findByIdAndUpdate(id, data, {
    new: true,
  });

  res.json(newModel);
};

const changeStatus = async (req, res = response) => {
  const { id, status } = req.params;
  const modelBorrado = await LineaArticulo.findByIdAndUpdate(
    id,
    { estado: status },
    { new: true }
  );

  res.json(modelBorrado);
};

const inactivate = async (req, res = response) => {
  const { id, status } = req.params;
  const modelBorrado = await LineaArticulo.findByIdAndUpdate(
    id,
    { estado: status },
    { new: true }
  );

  res.json(modelBorrado);
};

module.exports = {
  add,
  getAll,
  getById,
  update,
  changeStatus,
  inactivate,
};
