import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Input } from "../components/ui/Input";

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
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img
            src="/logo-nia.png"
            alt="NIA Assurance"
            className="w-16 h-16 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold text-neutral-800">Nia Assurance</h1>
          <p className="text-neutral-500 text-sm mt-1">Créer votre compte</p>
        </div>

        <Card padding="lg">
          {globalError && (
            <div className="mb-5 p-3 bg-red-50 rounded-lg text-red-600 text-sm">
              {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="prenom"
                label="Prénom"
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                placeholder="Moustapha"
                error={errors.prenom}
              />
              <Input
                id="nom"
                label="Nom"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                placeholder="Diallo"
                error={errors.nom}
              />
            </div>
            <Input
              id="email"
              label="Adresse email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              error={errors.email}
            />
            <Input
              id="telephone"
              label="Téléphone"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              placeholder="+227 90 00 00 00"
              error={errors.telephone}
            />
            <Input
              id="password"
              label="Mot de passe"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min. 8 caractères"
              error={errors.password}
            />
            <Input
              id="password2"
              label="Confirmer le mot de passe"
              name="password2"
              type="password"
              value={formData.password2}
              onChange={handleChange}
              placeholder="Répéter le mot de passe"
              error={errors.password2}
            />

            <Button type="submit" fullWidth loading={loading} className="mt-2">
              {loading ? "Création du compte..." : "Créer mon compte"}
            </Button>
          </form>

          <p className="text-center text-sm text-neutral-500 mt-6">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </Card>

        <p className="text-center text-xs text-neutral-400 mt-6">
          © {new Date().getFullYear()} Nia Assurance — Tous droits réservés
        </p>
      </div>
    </div>
  );
}
