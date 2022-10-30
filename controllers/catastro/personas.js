const { response } = require("express");
const { Persona } = require("../../models");

const getAll = async (req, res = response) => {
  const { limite = 10, desde = 0, search } = req.query;

  let query = {};

  if (search) {
    const regex = { $regex: ".*" + search + ".*", $options: "i" };
    query = {
      $or: [{ nombreApellido: regex }, { nroDoc: regex }],
    };
  }

  const [total, data] = await Promise.all([
    Persona.countDocuments(query),
    Persona.find(query)
      .populate("usuarioAlta", "username")
      .populate("usuarioModif", "username")
      .skip(Number(desde))
      .limit(Number(limite)),
  ]);

  res.json({
    total,
    data,
  });
};

const getById = async (req, res = response) => {
  const { id } = req.params;
  const modelDB = await Persona.findById(id)
    .populate("usuarioAlta", "username")
    .populate("usuarioModif", "username");

  res.json(modelDB);
};

const getByDocAndTipoDoc = async (req, res = response) => {
  const { nroDoc, tipoDoc = "CI" } = req.query;
  console.log(`Buscando la persona con doc  ${nroDoc}`);

  const modelDB = await obtenerPersonaByNroDocAndTipoDoc(nroDoc, tipoDoc);
  if (!modelDB) {
    console.log(`No existe la persona: ${tipoDoc}-${nroDoc}`);
    return res.status(404).json({
      msg: `No existe la persona: ${tipoDoc}-${nroDoc}`,
    });
  }

  return res.json(modelDB);
};

const add = async (req, res = response) => {
  try {
    const { _id, ruc, nroDoc, tipoDoc } = req.body;
    if (_id) {
      const modelDB = await Persona.findById(_id);
      if (modelDB) {
        return res.status(400).json({
          msg: `El Persona ${modelDB.nrodoc}, ya existe`,
        });
      }
    }

    if (await obtenerPersonaByNroDocAndTipoDoc(nroDoc, tipoDoc)) {
      return res.status(400).json({
        msg: `Ya existe la persona: ${tipoDoc}-${nroDoc}`,
      });
    }
    // Generar la data a guardar
    req.body._id = null;

    const newModel = await addPersona(req.body, req.usuario._id);
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
  const newModel = updatePersona(data, req.usuario._id);

  //  await Persona.findByIdAndUpdate(id, data, { new: true });

  res.json(newModel);
};

const obtenerPersonaByNroDocAndTipoDoc = async (
  nroDoc = "",
  tipoDoc = "CI"
) => {
  return await Persona.findOne({ nroDoc: nroDoc, tipoDoc: tipoDoc })
    .populate("usuarioAlta", "username")
    .populate("usuarioModif", "username");
};

const obtenerPersonaByNroDoc = async (doc = "") => {
  const query = { $or: [{ nroDoc: doc }, { ruc: doc }] };
  return await Persona.findOne(query)
    .populate("usuarioAlta", "username")
    .populate("usuarioModif", "username");
};

const addPersona = async (newPersona = Persona, usuario_id = null) => {
  const tipoDoc = newPersona.nroDoc.indexOf("-") > -1 ? "RUC" : "CI";
  newPersona.tipoDoc = tipoDoc;
  try {
    const existePersona = await obtenerPersonaByNroDocAndTipoDoc(
      newPersona.nroDoc,
      tipoDoc
    );
    if (existePersona) {
      throw new Error(
        `La persona con doc: ${tipoDoc}-${newPersona.nroDoc}, ya está registrado`
      );
    }

    // preguntar si tiene ruc
    if (newPersona.tipoDoc == "RUC" && !newPersona.ruc) {
      newPersona.ruc = newPersona.nroDoc;
    }
    newPersona.usuarioAlta = usuario_id;
    newPersona.nombreApellido = newPersona.nombreApellido.toUpperCase();

    console.log(`Persona guardada: ${newPersona.tipoDoc}-${newPersona.nroDoc}`);
    return await newPersona.save();
  } catch (error) {
    console.log("Error al agregar la persona", error);
    throw error;
  }
};

const updatePersona = async (personaUpdated = Persona, usuario_id = null) => {
  try {
    const { usuarioAlta, fechaAlta, nroDoc, tipoDoc, ...data } = personaUpdated;

    console.log(`Actualizando persona: ${nroDoc}`);
    data.usuarioModif = usuario_id;
    data.fechaModif = Date.now();
    data.nombreApellido = personaUpdated.nombreApellido.toUpperCase();
    return await Persona.findByIdAndUpdate(data._id, data, { new: true });
  } catch (error) {
    console.log("Error al actualizar la persona", error);
    throw error;
  }
};

module.exports = {
  add,
  getAll,
  getById,
  getByDocAndTipoDoc,
  update,
  updatePersona,
  addPersona,
  obtenerPersonaByNroDocAndTipoDoc,
  obtenerPersonaByNroDoc,
};
