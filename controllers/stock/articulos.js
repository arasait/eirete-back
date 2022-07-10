const { response } = require("express");
const { Articulo, Sucursal } = require("../../models");
const { addArticuloToSucursales } = require("./stock-sucursal");

const getAll = async (req, res = response) => {
  const {
    limite = 10,
    desde = 0,
    paginado = true,
    estado = true,
    search,
  } = req.query;
  const query = { estado };

  if (search)
    query.descripcion = { $regex: ".*" + search + ".*", $options: "i" };

  if (paginado === "true") {
    const [total, data] = await Promise.all([
      Articulo.countDocuments(query),
      Articulo.find(query)
        .populate({
          path: "lineaArticulo",
          select: "-__v",
          populate: {
            path: "familia",
            select: "-__v",
          },
        })
        .populate("usuarioAlta", "username")
        .populate("usuarioModif", "username")
        .skip(Number(desde))
        .limit(Number(limite)),
    ]);

    res.json({
      total,
      data,
    });
  } else {
    const data = await Articulo.find(query)
      .populate({
        path: "lineaArticulo",
        select: "-__v",
        populate: {
          path: "familia",
          select: "-__v",
        },
      })
      .populate("usuarioAlta", "username")
      .populate("usuarioModif", "username");
    res.json(data);
  }
};

const getById = async (req, res = response) => {
  const { id } = req.params;
  const modelDB = await Articulo.findById(id)
    .populate({
      path: "lineaArticulo",
      select: "-__v",
      populate: {
        path: "familia",
        select: "-__v",
      },
    })
    .populate("usuarioAlta", "username")
    .populate("usuarioModif", "username");

  res.json(modelDB);
};

const getByCodigo = async (req, res = response) => {
  const { codigo } = req.query;
  console.log(`Buscando el articulo por codigo  ${codigo}`);

  const modelDB = await existeArticuloByCodigoBarra(codigo);
  if (!modelDB) {
    console.log(`No existe el articulo con codigo: ${codigo}`);
    return res.status(404).json({
      msg: `No existe el articulo con codigo: ${codigo}`,
    });
  }

  return res.json(modelDB);
};

const add = async (req, res = response) => {
  try {
    const { _id, codigoBarra } = req.body;
    if (_id) {
      const modelDB = await Articulo.findById(_id);
      if (modelDB) {
        return res.status(400).json({
          msg: `El articulo ${modelDB.codigoBarra}, ya existe`,
        });
      }
    }

    if (await existeArticuloByCodigoBarra(codigoBarra)) {
      return res.status(400).json({
        msg: `Ya existe el articulo con codigo barra: ${codigoBarra}`,
      });
    }
    // Generar la data a guardar
    req.body._id = null;

    const newModel = await addArticulo(new Articulo(req.body), req.usuario._id);

    // Guardar el nuevo articulo en todas las sucursales
    // FIXME: No devuelve el id, por eso se hace nuevamente un find
    await addArticuloToSucursales(
      await Articulo.findOne({ descripcion: newModel.descripcion }),
      req.usuario._id
    );

    res.json(newModel);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      msg: `Hable con el administrador`,
    });
  }
};

const update = async (req, res = response) => {
  const { id } = req.params;
  const { usuarioAlta, fechaAlta, ...data } = req.body;

  data._id = id;

  const existe = await Articulo.findOne({
    _id: { $ne: id },
    $or: [{ descripcion: data.descripcion }, { codigoBarra: data.codigoBarra }],
  });

  console.log("existe", existe);
  if (existe) {
    return res.status(400).json({
      msg: `Ya existe el articulo ese codigoBarra o descripcion: ${data.codigoBarra} - ${data.descripcion}`,
    });
  }

  const newModel = await updateArticulo(data, req.usuario._id);

  res.json(newModel);
};

const existeArticuloByCodigoBarra = async (codigoBarra = "") => {
  return await Articulo.findOne({ codigoBarra })
    .populate({
      path: "lineaArticulo",
      select: "-__v",
      populate: {
        path: "familia",
        select: "-__v",
      },
    })
    .populate("usuarioAlta", "username")
    .populate("usuarioModif", "username");
};

const addArticulo = async (newArticulo = Articulo, usuario_id = null) => {
  try {
    if (await existeArticuloByCodigoBarra(newArticulo.codigoBarra)) {
      throw new Error(
        `El articulo con codigo: ${newArticulo.codigoBarra}, ya está registrado`
      );
    }

    newArticulo.usuarioAlta = usuario_id;
    newArticulo.descripcion = newArticulo.descripcion.toUpperCase();

    return await newArticulo.save();
  } catch (error) {
    console.log("Error al agregar el articulo", error);
    throw error;
  }
};

const updateArticulo = async (
  articuloUpdated = Articulo,
  usuario_id = null
) => {
  try {
    const { usuarioAlta, fechaAlta, codigo, ...data } = articuloUpdated;
    console.log(`Actualizando articulo: ${articuloUpdated.descripcion}`);
    data.usuarioModif = usuario_id;
    data.fechaModif = Date.now();
    data.descripcion = data.descripcion.toUpperCase();
    return await Articulo.findByIdAndUpdate(data._id, data, { new: true });
  } catch (error) {
    console.log("Error al actualizar el articulo", error);
    throw error;
  }
};

const changeStatus = async (req, res = response) => {
  const { id, status } = req.params;
  const modelBorrado = await Articulo.findByIdAndUpdate(
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
  getByCodigo,
  update,
  addArticulo,
  updateArticulo,
  existeArticuloByCodigoBarra,
  changeStatus,
};
