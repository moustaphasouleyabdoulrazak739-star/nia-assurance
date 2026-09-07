import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const InputField = ({ label, name, type = "text", placeholder, value, error, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
        error ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
      }`}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    prenom: "",
    nom: "",
    telephone: "",
    password: "",
    password2: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.prenom.trim()) newErrors.prenom = "Le prénom est requis.";
    if (!formData.nom.trim()) newErrors.nom = "Le nom est requis.";
    if (!formData.telephone.trim()) newErrors.telephone = "Le téléphone est requis.";
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Format d'email invalide.";
    }
    if (!formData.password) {
      newErrors.password = "Le mot de passe est requis.";
    } else if (formData.password.length < 8) {
      newErrors.password = "Minimum 8 caractères.";
    }
    if (!formData.password2) {
      newErrors.password2 = "Veuillez confirmer le mot de passe.";
    } else if (formData.password !== formData.password2) {
      newErrors.password2 = "Les mots de passe ne correspondent pas.";
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError("");

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      // Inscription
      await api.post("/auth/register/", {
        email: formData.email,
        prenom: formData.prenom,
        nom: formData.nom,
        telephone: formData.telephone,
        password: formData.password,
        password2: formData.password2,
      });

      // Connexion automatique après inscription
      await login(formData.email, formData.password);
      navigate("/dashboard");
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const fieldErrors = {};
        if (data.email) fieldErrors.email = data.email[0];
        if (data.nom) fieldErrors.nom = data.nom[0];
        if (data.prenom) fieldErrors.prenom = data.prenom[0];
        if (data.telephone) fieldErrors.telephone = data.telephone[0];
        if (data.password) fieldErrors.password = data.password[0];
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        } else {
          setGlobalError(data.detail || "Une erreur est survenue.");
        }
      } else {
        setGlobalError("Impossible de contacter le serveur.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src="/logo-nia.png" alt="NIA Assurance" className="w-24 h-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">Nia Assurance</h1>
          <p className="text-gray-500 text-sm mt-1">Créer votre compte</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {globalError && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Prénom" name="prenom" placeholder="Moustapha" value={formData.prenom} error={errors.prenom} onChange={handleChange} />
              <InputField label="Nom" name="nom" placeholder="Diallo" value={formData.nom} error={errors.nom} onChange={handleChange} />
            </div>
            <InputField label="Adresse email" name="email" type="email" placeholder="you@example.com" value={formData.email} error={errors.email} onChange={handleChange} />
            <InputField label="Téléphone" name="telephone" placeholder="+227 90 00 00 00" value={formData.telephone} error={errors.telephone} onChange={handleChange} />
            <InputField label="Mot de passe" name="password" type="password" placeholder="Min. 8 caractères" value={formData.password} error={errors.password} onChange={handleChange} />
            <InputField label="Confirmer le mot de passe" name="password2" type="password" placeholder="Répéter le mot de passe" value={formData.password2} error={errors.password2} onChange={handleChange} />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Création du compte...
                </>
              ) : (
                "Créer mon compte"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Nia Assurance — Tous droits réservés
        </p>
      </div>
    </div>
  );
}